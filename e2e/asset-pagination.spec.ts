import { defaultAssetTypes } from '../src/lib/assets/type-options'
import { expect, test, type Page } from '@playwright/test'

const assets = Array.from({ length: 61 }, (_, index) => ({
  id: `asset-${index + 1}`,
  equipmentId: `EQ-${String(index + 1).padStart(3, '0')}`,
  name: `Asset ${String(index + 1).padStart(3, '0')}`,
  type: index < 30 ? 'EQUIPMENT' : 'VEHICLE',
  category: index < 30 ? 'Excavator' : 'Truck',
  status: index < 30 ? 'AVAILABLE' : 'IN_USE',
  purchaseCost: 1000,
  _count: { requests: 0, maintenanceRecords: 0 },
}))

async function mockAssetsApi(page: Page, baseURL: string) {
  const company = { id: 'company', name: 'Example Construction', appName: 'BuildFlo', currency: 'USD' }
  const user = { id: 'admin', firstName: 'Team', lastName: 'Admin', email: 'admin@example.test', companyId: company.id, company, role: 'ADMIN' }
  await page.context().addCookies([{ name: 'auth-token', value: 'mock-ui-session', url: baseURL }])
  await page.addInitScript(({ user }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token: 'mock-ui-session', isAuthenticated: true }, version: 0 }))
  }, { user })
  await page.route('**/api/**', async route => {
    const { pathname, searchParams } = new URL(route.request().url())
    let response: unknown = []
    if (pathname === '/api/company/settings') response = { company }
    if (pathname === '/api/users') response = [user]
    if (pathname.includes('/notifications')) response = { notifications: [], unreadCount: 0 }
    if (pathname === '/api/asset-types') response = defaultAssetTypes
    if (pathname === '/api/asset-categories') response = ['Excavator', 'Truck']
    if (pathname === '/api/assets') {
      expect(searchParams.has('page')).toBe(true)
      expect(searchParams.has('pageSize')).toBe(true)
      const filtered = assets.filter(asset =>
        (['type', 'status', 'category'] as const).every(key => {
          const param = { type: 'types', status: 'statuses', category: 'categories' }[key]
          const values: string[] | null = searchParams.has(param) ? JSON.parse(searchParams.get(param)!) : null
          return values === null || values.includes(asset[key])
        })
      )
      const search = searchParams.get('search')?.toLowerCase() || ''
      const sorted = filtered.filter(asset => [asset.equipmentId, asset.name, asset.category].some(value => value.toLowerCase().includes(search)))
        .sort((a, b) => a.equipmentId.localeCompare(b.equipmentId) * (searchParams.get('sortDirection') === 'desc' ? -1 : 1))
      const pageSize = Number(searchParams.get('pageSize'))
      const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
      const currentPage = Math.min(Number(searchParams.get('page')), totalPages)
      response = {
        data: sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        pagination: { page: currentPage, pageSize, total: sorted.length, totalPages },
        summary: {
          availableCount: filtered.filter(asset => asset.status === 'AVAILABLE').length,
          inUseCount: filtered.filter(asset => asset.status === 'IN_USE').length,
          maintenanceCount: 0,
          totalValue: filtered.length * 1000,
        },
      }
    }
    await route.fulfill({ json: response })
  })
}

test.beforeEach(async ({ page, baseURL }) => {
  await mockAssetsApi(page, baseURL!)
})

test('paginates assets with accurate ranges, row numbers, and page sizes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/dashboard/assets')
  const pagination = page.getByRole('navigation', { name: 'Asset pagination' })
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(25)
  await expect(pagination.getByRole('status')).toHaveText('Showing 1–25 of 61 assets')
  await expect(pagination.getByRole('button', { name: 'Previous' })).toBeDisabled()
  await expect(page.getByText('30 available', { exact: true })).toBeVisible()
  await expect(page.getByText('$61,000.00', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('assets-desktop.png'), fullPage: true })

  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(pagination.getByRole('status')).toHaveText('Showing 26–50 of 61 assets')
  await expect(rows.first().locator('td').nth(1)).toHaveText('26')
  await expect(rows.first()).toContainText('Asset 026')
  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(rows).toHaveCount(11)
  await expect(pagination.getByRole('status')).toHaveText('Showing 51–61 of 61 assets')
  await expect(pagination.getByRole('button', { name: 'Next' })).toBeDisabled()
  await pagination.getByRole('button', { name: 'Previous' }).click()
  await expect(rows.first()).toContainText('Asset 026')

  await page.getByLabel('Rows per page').selectOption('50')
  await expect(rows).toHaveCount(50)
  await expect(pagination.getByRole('status')).toHaveText('Showing 1–50 of 61 assets')
  await page.getByLabel('Rows per page').selectOption('100')
  await expect(rows).toHaveCount(61)
  await expect(pagination.getByRole('button', { name: 'Next' })).toBeDisabled()
})

test('debounces search and only requests the current server page', async ({ page }) => {
  const requests: URL[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname === '/api/assets') requests.push(url)
  })
  await page.goto('/dashboard/assets')
  const pagination = page.getByRole('navigation', { name: 'Asset pagination' })
  await expect(pagination.getByRole('status')).toHaveText('Showing 1–25 of 61 assets')
  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(pagination.getByRole('status')).toHaveText('Showing 26–50 of 61 assets')
  expect(requests.at(-1)!.searchParams.get('page')).toBe('2')
  expect(requests.at(-1)!.searchParams.get('pageSize')).toBe('25')
  requests.length = 0
  await page.getByLabel('Search assets').pressSequentially('EQ-061', { delay: 20 })
  await expect(pagination.getByRole('status')).toHaveText('Showing 1–1 of 1 assets')
  expect(requests).toHaveLength(1)
  expect(requests[0].searchParams.get('search')).toBe('EQ-061')
  expect(requests[0].searchParams.get('page')).toBe('1')
  await expect(page.getByLabel('Search assets')).toBeFocused()
})

test('searches and sorts across all pages and resets each filter to page one', async ({ page }) => {
  await page.goto('/dashboard/assets')
  const pagination = page.getByRole('navigation', { name: 'Asset pagination' })
  const next = pagination.getByRole('button', { name: 'Next' })
  await next.click()
  await page.getByLabel('Search assets').fill('EQ-061')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await expect(page.locator('tbody tr')).toContainText('Asset 061')
  await expect(pagination.getByRole('status')).toHaveText('Showing 1–1 of 1 assets')
  await page.getByLabel('Search assets').fill('no matching asset')
  await expect(page.getByText('No assets found', { exact: true })).toBeVisible()
  await expect(pagination.getByRole('status')).toHaveText('Showing 0–0 of 0 assets')
  await expect(next).toBeDisabled()
  await expect(pagination.getByRole('button', { name: 'Previous' })).toBeDisabled()

  await page.getByLabel('Search assets').fill('')
  await next.click()
  await page.getByRole('columnheader', { name: 'Equipment ID' }).click()
  await expect(pagination.getByText('Page 1 of 3')).toBeVisible()
  await expect(page.locator('tbody tr').first()).toContainText('Asset 061')
  await next.click()
  await expect(page.locator('tbody tr').first()).toContainText('Asset 036')

  for (const [label, value] of [
    ['Filter by asset type', 'Equipment'],
    ['Filter by category', 'Excavator'],
    ['Filter by status', 'Available'],
  ]) {
    await page.getByRole('button', { name: new RegExp(label) }).click()
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
    await page.getByRole('checkbox', { name: value, exact: true }).check()
    await page.keyboard.press('Escape')
    await expect(pagination.getByRole('status')).toHaveText('Showing 1–25 of 30 assets')
    await next.click()
    await expect(pagination.getByRole('status')).toHaveText('Showing 26–30 of 30 assets')
    await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
    await expect(pagination.getByRole('status')).toHaveText('Showing 1–25 of 61 assets')
    await next.click()
  }
})

test('selects only the visible page and preserves other pages when deselecting', async ({ page }) => {
  await page.goto('/dashboard/assets')
  const selectAll = page.getByRole('checkbox', { name: 'Select all assets on this page' })
  const pagination = page.getByRole('navigation', { name: 'Asset pagination' })
  await selectAll.check()
  await expect(page.getByText('25 selected', { exact: true })).toBeVisible()
  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(selectAll).not.toBeChecked()
  await page.getByRole('checkbox', { name: 'Select EQ-026', exact: true }).check()
  await expect(selectAll).toHaveJSProperty('indeterminate', true)
  await selectAll.check()
  await expect(page.getByText('50 selected', { exact: true })).toBeVisible()
  await selectAll.uncheck()
  await expect(page.getByText('25 selected', { exact: true })).toBeVisible()
  await pagination.getByRole('button', { name: 'Previous' }).click()
  await expect(selectAll).toBeChecked()
  await page.getByLabel('Search assets').fill('EQ-061')
  await expect(page.getByText(/^\d+ selected$/)).toHaveCount(0)
  await expect(selectAll).not.toBeChecked()
})

test('keeps pagination controls within the viewport on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard/assets')
  const pagination = page.getByRole('navigation', { name: 'Asset pagination' })
  await expect(pagination.getByRole('status')).toHaveText('Showing 1–25 of 61 assets')
  await pagination.scrollIntoViewIfNeeded()
  for (const control of await pagination.locator('button, select').all()) {
    const bounds = await control.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
  }
  await page.screenshot({ path: testInfo.outputPath('assets-mobile.png'), fullPage: true })
  await pagination.getByRole('button', { name: 'Next' }).click()
  await expect(pagination.getByRole('status')).toHaveText('Showing 26–50 of 61 assets')
})


test('sends multiple checkbox selections to the server and restores the retired-excluded default', async ({ page }) => {
  const requests: URL[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname === '/api/assets') requests.push(url)
  })
  await page.goto('/dashboard/assets')
  const pagination = page.getByRole('navigation', { name: 'Asset pagination' })
  await expect(pagination.getByRole('status')).toContainText('of 61 assets')
  expect(JSON.parse(requests.at(-1)!.searchParams.get('statuses')!)).not.toContain('RETIRED')
  const status = page.getByRole('button', { name: /^Filter by status/ })
  await status.click()
  await expect(page.getByRole('checkbox', { name: 'Retired', exact: true })).not.toBeChecked()
  await page.getByRole('checkbox', { name: 'Retired', exact: true }).check()
  await expect(page.getByText('Retired assets hidden.', { exact: false })).toHaveCount(0)
  await expect.poll(() => JSON.parse(requests.at(-1)!.searchParams.get('statuses')!)).toContain('RETIRED')
  await page.keyboard.press('Escape')
  await expect(status).toBeFocused()
  await page.getByRole('button', { name: /^Filter by asset type/ }).click()
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await expect(pagination.getByRole('status')).toHaveText('Showing 0–0 of 0 assets')
  await page.getByRole('checkbox', { name: 'Equipment', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Vehicle', exact: true }).check()
  await expect(pagination.getByRole('status')).toContainText('of 61 assets')
  expect(JSON.parse(requests.at(-1)!.searchParams.get('types')!)).toEqual(['EQUIPMENT', 'VEHICLE'])
  // Opening another filter dismisses the first without losing its selection.
  await page.getByRole('button', { name: /^Filter by category/ }).click()
  await expect(page.getByRole('group', { name: 'Type options' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear selection', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Excavator', exact: true }).check()
  await page.getByRole('checkbox', { name: 'Truck', exact: true }).check()
  await expect(pagination.getByRole('status')).toContainText('of 61 assets')
  expect(JSON.parse(requests.at(-1)!.searchParams.get('categories')!)).toEqual(['Excavator', 'Truck'])
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await status.click()
  await expect(page.getByRole('checkbox', { name: 'Retired', exact: true })).not.toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Available', exact: true })).toBeChecked()
  await page.keyboard.press('Escape')
  await page.reload()
  await status.click()
  await expect(page.getByRole('checkbox', { name: 'Retired', exact: true })).not.toBeChecked()
})

for (const width of [1440, 390]) {
  test(`checkbox filters support keyboard and fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/dashboard/assets')
    const status = page.getByRole('button', { name: /^Filter by status/ })
    await status.focus()
    await page.keyboard.press('Enter')
    const options = page.getByRole('group', { name: 'Status options' })
    await expect(options).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(options.getByRole('button', { name: 'Select all', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(options.getByRole('checkbox', { name: 'Retired', exact: true })).toBeChecked()
    await options.getByRole('checkbox', { name: 'Retired', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(options.getByRole('checkbox', { name: 'Retired', exact: true })).not.toBeChecked()
    const bounds = await options.boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
    await page.screenshot({ path: testInfo.outputPath(`asset-filters-${width}.png`), fullPage: true })
    await page.keyboard.press('Escape')
    await expect(options).toHaveCount(0)
    await expect(status).toBeFocused()
  })
}


test('expired asset sessions offer sign-in and clear stale browser identity', async ({ page }) => {
  await page.route('**/api/assets?*', route => route.fulfill({ status: 401, json: { error: 'Unauthorized' } }))
  await page.goto('/dashboard/assets')
  await expect(page.getByRole('alert').filter({ hasText: 'Your session has expired or changed' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign in again', exact: true }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
  expect((await page.context().cookies()).some(cookie => cookie.name === 'auth-token')).toBe(false)
})

test('asset failures retain server error details and retry both list and categories', async ({ page }) => {
  let fail = true
  await page.route('**/api/assets?*', route => fail ? route.fulfill({ status: 503, json: { error: 'Assets temporarily unavailable' } }) : route.fallback())
  await page.goto('/dashboard/assets')
  await expect(page.getByRole('alert').filter({ hasText: 'Assets temporarily unavailable' })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('tbody tr')).toHaveCount(25)
})
