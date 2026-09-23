import { expect, test, type Page } from '@playwright/test'

// These UI checks intercept every API request and never use the configured database.
async function mockAssetApi(page: Page, baseURL: string) {
  const companyStatus = { id: 'awaiting-parts', name: 'Awaiting Parts', baseStatus: 'UNDER_MAINTENANCE', isActive: true }
  const asset: Record<string, unknown> = {
    id: 'feedback-asset', name: 'CAT 320 Excavator', type: 'EQUIPMENT', status: 'AVAILABLE',
    statusDefinitionId: null, statusDefinition: null, currentLocation: 'Main Yard',
    requests: [], maintenanceSchedules: [], maintenanceRecords: [], attachments: [], customFieldValues: [],
    _count: { issues: 1 },
  }
  const readings = [
    { id: 'hours-new', readingType: 'HOURS', value: 420.5, recordedAt: '2026-09-20T12:00:00Z', notes: null, recordedBy: null },
    { id: 'miles', readingType: 'MILES', value: 1200, recordedAt: '2026-09-19T12:00:00Z', notes: null, recordedBy: null },
    { id: 'hours-old', readingType: 'HOURS', value: 400, recordedAt: '2026-09-18T12:00:00Z', notes: null, recordedBy: null },
  ]
  const issue = {
    id: 'feedback-issue', title: 'Hydraulic leak', status: 'OPEN', urgency: 'HIGH',
    createdAt: '2026-09-20T12:00:00Z', reportedBy: null, description: null, meterReading: null,
    asset: { id: asset.id, name: asset.name, type: asset.type }, _count: { comments: 0 },
  }
  const savedPayloads: Record<string, unknown>[] = []
  await page.context().addCookies([{ name: 'auth-token', value: 'mock-ui-session', url: baseURL }])
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const method = request.method()
    let response: unknown = []
    if (path === '/api/asset-statuses') response = [companyStatus]
    if (path === '/api/assets') {
      response = [asset]
      if (method === 'POST') {
        const data = request.postDataJSON()
        savedPayloads.push(data)
        Object.assign(asset, data, { statusDefinition: data.statusDefinitionId ? companyStatus : null })
        response = asset
      }
    }
    if (path === '/api/assets/feedback-asset') {
      if (method === 'PATCH') {
        const data = request.postDataJSON()
        savedPayloads.push(data)
        Object.assign(asset, data, { statusDefinition: data.statusDefinitionId ? companyStatus : null })
      }
      response = asset
    }
    if (path === '/api/assets/feedback-asset/meter-readings') {
      if (method === 'POST') {
        const reading = { ...request.postDataJSON(), id: 'added-reading', recordedBy: null }
        readings.unshift(reading)
        response = reading
      } else response = readings
    }
    if (path === '/api/assets/feedback-asset/issues' || path === '/api/assets/issues') response = [issue]
    if (path === '/api/assets/issues/feedback-issue') {
      if (method === 'PATCH') {
        issue.status = request.postDataJSON().status
        asset._count = { issues: ['OPEN', 'IN_PROGRESS'].includes(issue.status) ? 1 : 0 }
      }
      response = { ...issue, comments: [], attachments: [], workOrders: [] }
    }
    if (path === '/api/asset-issue-notification-settings') response = { notifyAdmins: true, notifyStaff: false, recipientUserIds: [] }
    if (path.includes('/notifications')) response = { notifications: [], unreadCount: 0 }
    await route.fulfill({ status: method === 'POST' ? 201 : 200, json: response })
  })
  return { asset, readings, savedPayloads }
}

test('keeps equipment issues and work orders inside Assets', async ({ page, baseURL }) => {
  await mockAssetApi(page, baseURL!)
  await page.goto('/dashboard/assets')
  await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible()
  await expect(page.locator('nav').getByRole('link', { name: 'Equipment Issues' })).toHaveCount(0)
  await expect(page.getByRole('main').getByRole('link', { name: 'Work Orders' })).toHaveAttribute('href', '/dashboard/assets/work-orders')
  await page.getByRole('main').getByRole('link', { name: 'Equipment Issues' }).click()
  await expect(page).toHaveURL(/\/dashboard\/assets\/issues$/)
  await expect(page.getByRole('heading', { name: 'Equipment Issues' })).toBeVisible()
  await expect(page.locator('nav').getByRole('link', { name: 'Assets', exact: true })).toHaveClass(/bg-slate-700/)
  await page.getByRole('link', { name: 'Back to Assets' }).click()
  await expect(page.getByRole('heading', { name: 'Assets', exact: true })).toBeVisible()
})

test('uses one status selector and clears the company status when switching to a standard status', async ({ page, baseURL }) => {
  const { savedPayloads } = await mockAssetApi(page, baseURL!)
  await page.goto('/dashboard/assets/new')
  await page.getByLabel('Asset Name *').fill('CAT 320 Excavator')
  await expect(page.getByLabel('Status *', { exact: true })).toHaveCount(1)
  await expect(page.getByLabel('Custom Status', { exact: true })).toHaveCount(0)
  await page.getByLabel('Status *', { exact: true }).selectOption({ label: 'Awaiting Parts' })
  await page.getByRole('button', { name: 'Create Asset' }).click()
  await expect(page.getByRole('heading', { name: 'CAT 320 Excavator' })).toBeVisible()
  expect(savedPayloads[0]).toMatchObject({ status: 'UNDER_MAINTENANCE', statusDefinitionId: 'awaiting-parts' })

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Status *', { exact: true })).toHaveValue('custom:awaiting-parts')
  await page.getByLabel('Status *', { exact: true }).selectOption({ label: 'Available' })
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  expect(savedPayloads[1]).toMatchObject({ status: 'AVAILABLE', statusDefinitionId: null })
  await page.reload()
  await expect(page.getByText('Available', { exact: true })).toBeVisible()
})

test('shows latest readings, opens the add form, and refreshes readings and issue counts', async ({ page, baseURL }, testInfo) => {
  await mockAssetApi(page, baseURL!)
  await page.goto('/dashboard/assets/feedback-asset')
  const meters = page.getByRole('region', { name: 'Latest meter readings' })
  await expect(meters).toContainText('420.5 hours')
  await expect(meters).toContainText('1,200 miles')
  await expect(meters).not.toContainText('400 hours')
  await expect(page.getByRole('button', { name: 'View issues: 1 open' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('asset-overview.png'), fullPage: true })

  await page.getByRole('button', { name: 'Add meter reading' }).click()
  const form = page.locator('form').filter({ has: page.getByText('Hour Meter Reading *', { exact: true }) })
  await expect(page.getByRole('heading', { name: 'Log Meter Reading' })).toBeVisible()
  await form.locator('input[type="number"]').fill('425')
  await form.getByRole('button', { name: 'Log Reading', exact: true }).click()
  await expect(form).toHaveCount(0)
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await expect(meters).toContainText('425 hours')

  await page.getByRole('button', { name: 'View issues: 1 open' }).click()
  await page.getByRole('button', { name: /Hydraulic leak/ }).click()
  await page.locator('select').filter({ has: page.locator('option[value="RESOLVED"]') }).selectOption('RESOLVED')
  await expect(page.getByRole('button', { name: /Hydraulic leak/ })).toContainText('RESOLVED')
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View issues: 0 open' })).toBeVisible()
})

test('shows clear empty states and keeps the current retired status visible while editing', async ({ page, baseURL }) => {
  const { asset, readings } = await mockAssetApi(page, baseURL!)
  readings.length = 0
  Object.assign(asset, {
    _count: { issues: 0 }, status: 'IN_USE', statusDefinitionId: 'old-status',
    statusDefinition: { id: 'old-status', name: 'Legacy Dispatch', baseStatus: 'IN_USE', isActive: false },
  })
  await page.goto('/dashboard/assets/feedback-asset')
  await expect(page.getByRole('region', { name: 'Latest meter readings' })).toContainText('No readings yet')
  await expect(page.getByRole('button', { name: 'View issues: 0 open' })).toContainText('No open issues')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Status *', { exact: true })).toHaveValue('custom:old-status')
  await expect(page.getByLabel('Status *', { exact: true }).locator('option:checked')).toHaveText('Legacy Dispatch')
})
