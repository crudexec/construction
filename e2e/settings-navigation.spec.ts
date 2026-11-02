import { expect, test, type Page } from '@playwright/test'

async function mockSettingsApi(page: Page, baseURL: string) {
  // Isolate navigation checks from the configured database and all external services.
  const company = { id: 'company', name: 'Example Construction', appName: 'BuildFlo', currency: 'USD' }
  const user = { id: 'admin', firstName: 'Team', lastName: 'Admin', email: 'admin@example.test', companyId: company.id, company, role: 'ADMIN' }
  await page.context().addCookies([{ name: 'auth-token', value: 'mock-ui-session', url: baseURL }])
  await page.addInitScript(({ user }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token: 'mock-ui-session', isAuthenticated: true }, version: 0 }))
  }, { user })
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let response: unknown = []
    if (path === '/api/company/settings') response = { company }
    if (path === '/api/users') response = [user]
    if (path.includes('/notifications')) response = { notifications: [], unreadCount: 0 }
    if (path === '/api/asset-issue-notification-settings') response = { notifyAdmins: true, notifyStaff: false, recipientUserIds: [] }
    await route.fulfill({ json: response })
  })
}

test('groups settings while preserving direct links and browser history', async ({ page, baseURL }, testInfo) => {
  await mockSettingsApi(page, baseURL!)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/dashboard/settings?tab=asset-statuses')
  const categories = page.getByRole('navigation', { name: 'Settings categories', exact: true })
  await expect(categories.getByRole('link')).toHaveCount(8)
  await expect(categories.getByRole('link', { name: 'Assets', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('navigation', { name: 'Assets settings' }).getByRole('link', { name: 'Statuses', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Asset Statuses', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Assets settings' }).getByRole('link', { name: 'Custom Fields' }).click()
  await expect(page).toHaveURL(/tab=assets&section=asset-custom-fields/)
  await expect(page.getByRole('heading', { name: 'Asset Custom Fields', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('settings-desktop.png'), fullPage: true })
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Asset Statuses', exact: true })).toBeVisible()

  await categories.getByRole('link', { name: 'Vendors', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Vendor Categories', exact: true })).toBeVisible()
  await page.getByRole('navigation', { name: 'Vendors settings' }).getByRole('link', { name: 'Service Tags' }).click()
  await expect(page.getByRole('heading', { name: 'Vendor Service Tags', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/tab=vendors&section=service-tags/)

  await categories.getByRole('link', { name: 'Projects', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Project Templates', exact: true })).toBeVisible()
  const projects = page.getByRole('navigation', { name: 'Projects settings' })
  await projects.getByRole('link', { name: 'Cost Codes' }).click()
  await expect(page.getByRole('heading', { name: 'Cost Codes', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/tab=projects&section=cost-codes/)
  await projects.getByRole('link', { name: 'File Tags' }).click()
  await expect(page.getByRole('heading', { name: 'File Tags (0)', exact: true })).toBeVisible()
  await page.reload()
  await expect(projects.getByRole('link', { name: 'File Tags' })).toHaveAttribute('aria-current', 'page')
  await categories.getByRole('link', { name: 'Team', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Team Management', exact: true })).toBeVisible()
})

test('keeps grouped navigation usable on narrow screens and handles unknown links', async ({ page, baseURL }, testInfo) => {
  await mockSettingsApi(page, baseURL!)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard/settings?tab=assets&section=unknown')
  const categories = page.getByRole('navigation', { name: 'Settings categories', exact: true })
  await expect(page.getByRole('heading', { name: 'Asset Custom Fields', exact: true })).toBeVisible()
  for (const link of await categories.getByRole('link').all()) {
    const bounds = await link.boundingBox()
    expect(bounds).not.toBeNull()
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
  }
  await page.screenshot({ path: testInfo.outputPath('settings-mobile.png'), fullPage: true })
  await page.goto('/dashboard/settings?tab=unknown')
  await expect(page.getByRole('heading', { name: 'Company Information', exact: true })).toBeVisible()
})

test('keeps previous settings URLs working for each consolidated category', async ({ page, baseURL }) => {
  await mockSettingsApi(page, baseURL!)
  for (const [tab, category, section] of [
    ['asset-custom-fields', 'Assets', 'Custom Fields'],
    ['asset-statuses', 'Assets', 'Statuses'],
    ['templates', 'Projects', 'Templates'],
    ['cost-codes', 'Projects', 'Cost Codes'],
    ['file-tags', 'Projects', 'File Tags'],
    ['vendor-categories', 'Vendors', 'Categories'],
    ['service-tags', 'Vendors', 'Service Tags'],
  ]) {
    await page.goto(`/dashboard/settings?tab=${tab}`)
    await expect(page.getByRole('navigation', { name: 'Settings categories', exact: true }).getByRole('link', { name: category, exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('navigation', { name: `${category} settings`, exact: true }).getByRole('link', { name: section, exact: true })).toHaveAttribute('aria-current', 'page')
  }
})
