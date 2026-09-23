import { expect, test, type APIRequestContext, type Locator } from '@playwright/test'
import { login } from './helpers/auth'
import {
  closePrisma,
  createContractComplianceFixture,
  deleteFixtureCompany,
  type ContractComplianceFixture,
} from './helpers/test-data'

let fixture: ContractComplianceFixture

async function loginToken(request: APIRequestContext) {
  const loginResponse = await request.post('/api/auth/login', {
    data: {
      email: fixture.user.email,
      password: fixture.user.password,
    },
  })
  expect(loginResponse.ok()).toBeTruthy()
  const body = await loginResponse.json()
  return body.token as string
}

async function createAsset(request: APIRequestContext, token: string) {
  const response = await request.post('/api/assets', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'E2E Excavator 310',
      description: 'ACA asset management coverage asset',
      type: 'EQUIPMENT',
      serialNumber: 'E2E-SN-310',
      status: 'AVAILABLE',
      currentLocation: 'Yard A',
      make: 'CAT',
      model: '310',
      year: 2024,
      vin: '1HTE2EASSET000001',
      licensePlate: 'E2E310',
      purchaseCost: 125_000,
      purchaseDate: '2026-01-15',
      warrantyExpiry: '2028-01-15',
      notes: 'Created by Playwright',
    },
  })
  expect(response.status()).toBe(201)
  return response.json()
}

function fieldByLabel(container: Locator, label: string) {
  return container.locator('label', { hasText: label }).first().locator('xpath=..').locator('input, textarea, select').first()
}

function modalByTitle(page: { locator: (selector: string, options?: { hasText?: string }) => Locator }, title: string) {
  return page.locator('div.fixed', { hasText: title }).last()
}

test.beforeEach(async () => {
  fixture = await createContractComplianceFixture()
})

test.afterEach(async () => {
  await deleteFixtureCompany(fixture.companyId)
})

test.afterAll(async () => {
  await closePrisma()
})

test('covers asset identity, purchase data, custom fields, assignment, rental history, meters, service, and DOT inspection', async ({ request }) => {
  const token = await loginToken(request)

  const statusResponse = await request.post('/api/asset-statuses', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'E2E Ready for Dispatch',
      baseStatus: 'AVAILABLE',
      color: '#16a34a',
    },
  })
  expect(statusResponse.status()).toBe(201)
  const status = await statusResponse.json()

  const asset = await createAsset(request, token)
  expect(asset).toMatchObject({
    name: 'E2E Excavator 310',
    type: 'EQUIPMENT',
    make: 'CAT',
    model: '310',
    year: 2024,
    serialNumber: 'E2E-SN-310',
  })

  const updateResponse = await request.patch(`/api/assets/${asset.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      statusDefinitionId: status.id,
      customStatusNote: 'Ready after pre-trip check',
      currentAssigneeId: fixture.user.id,
      purchasedFromVendorId: fixture.vendorId,
      poNumber: 'E2E-PO-ASSET',
      invoiceNumber: 'E2E-INV-ASSET',
      financingType: 'FINANCED',
      financedAmount: 100_000,
      lender: 'E2E Equipment Finance',
      loanTermMonths: 48,
      depreciationMethod: 'Straight line',
      usefulLifeYears: 7,
      salvageValue: 20_000,
    },
  })
  expect(updateResponse.ok()).toBeTruthy()
  const updated = await updateResponse.json()
  expect(updated).toMatchObject({
    statusDefinitionId: status.id,
    status: 'AVAILABLE',
    customStatusNote: 'Ready after pre-trip check',
    currentAssigneeId: fixture.user.id,
    purchasedFromVendorId: fixture.vendorId,
    poNumber: 'E2E-PO-ASSET',
    invoiceNumber: 'E2E-INV-ASSET',
    financingType: 'FINANCED',
    financedAmount: 100_000,
    lender: 'E2E Equipment Finance',
    loanTermMonths: 48,
  })

  const customFieldResponse = await request.post('/api/asset-custom-fields', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'E2E Fleet Category',
      fieldType: 'SELECT',
      selectOptions: ['Earthwork', 'Concrete'],
    },
  })
  expect(customFieldResponse.status()).toBe(201)
  const customField = await customFieldResponse.json()

  const customValueResponse = await request.put(`/api/assets/${asset.id}/custom-field-values`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      values: {
        [customField.id]: 'Earthwork',
      },
    },
  })
  expect(customValueResponse.ok()).toBeTruthy()
  const customValues = await customValueResponse.json()
  expect(customValues[0]).toMatchObject({
    fieldDefinitionId: customField.id,
    value: 'Earthwork',
  })

  const firstRateResponse = await request.post(`/api/assets/${asset.id}/rental-rates`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      hourlyRate: 150,
      dailyRate: 900,
      monthlyRate: 18_000,
      notes: 'Initial ACA rental sheet rate',
    },
  })
  expect(firstRateResponse.status()).toBe(201)

  const secondRateResponse = await request.post(`/api/assets/${asset.id}/rental-rates`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      hourlyRate: 175,
      dailyRate: 1_000,
      monthlyRate: 20_000,
      notes: 'Updated ACA rental sheet rate',
    },
  })
  expect(secondRateResponse.status()).toBe(201)

  const ratesResponse = await request.get(`/api/assets/${asset.id}/rental-rates`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(ratesResponse.ok()).toBeTruthy()
  const rates = await ratesResponse.json()
  expect(rates).toHaveLength(2)
  expect(rates.map((rate: { hourlyRate: number }) => rate.hourlyRate).sort()).toEqual([150, 175])

  const hoursResponse = await request.post(`/api/assets/${asset.id}/meter-readings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      readingType: 'HOURS',
      value: 420.5,
      recordedAt: '2026-06-10T12:00:00.000Z',
      notes: 'Morning check',
    },
  })
  expect(hoursResponse.status()).toBe(201)

  const milesResponse = await request.post(`/api/assets/${asset.id}/meter-readings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      readingType: 'MILES',
      value: 12_345,
      recordedAt: '2026-06-11T12:00:00.000Z',
      notes: 'Transport mileage',
    },
  })
  expect(milesResponse.status()).toBe(201)

  const assignmentResponse = await request.post(`/api/assets/${asset.id}/job-assignments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      projectId: fixture.projectId,
      assignedAt: '2026-06-14',
      removedAt: '2026-06-16',
      notes: 'Assigned to ACA project',
    },
  })
  expect(assignmentResponse.status()).toBe(201)
  const assignment = await assignmentResponse.json()
  expect(assignment.project.id).toBe(fixture.projectId)
  expect(assignment.assignedAt).toContain('2026-06-14')
  expect(assignment.removedAt).toContain('2026-06-16')

  const activeAssignmentResponse = await request.post(`/api/assets/${asset.id}/job-assignments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      projectId: fixture.projectId,
      assignedAt: '2026-06-17',
      notes: 'Active ACA assignment',
    },
  })
  expect(activeAssignmentResponse.status()).toBe(201)
  const activeAssignment = await activeAssignmentResponse.json()
  expect(activeAssignment.removedAt).toBeNull()

  const removalResponse = await request.patch(`/api/assets/job-assignments/${activeAssignment.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(removalResponse.ok()).toBeTruthy()
  const removedAssignment = await removalResponse.json()
  expect(removedAssignment.removedAt).toBeTruthy()

  const serviceResponse = await request.post(`/api/assets/${asset.id}/maintenance/records`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: 'E2E Oil and hydraulic service',
      description: 'Logged basic fluids and filters',
      performedDate: '2026-06-12',
      serviceType: 'OIL_CHANGE',
      quantity: 12,
      quantityUnit: 'qt',
      meterReadingAtService: 421,
      cost: 325,
      notes: 'Oil, fuel filter, and hydraulic filter checked',
    },
  })
  expect(serviceResponse.status()).toBe(201)
  const service = await serviceResponse.json()
  expect(service).toMatchObject({
    serviceType: 'OIL_CHANGE',
    quantity: 12,
    quantityUnit: 'qt',
    meterReadingAtService: 421,
  })

  const inspectionResponse = await request.post(`/api/assets/${asset.id}/inspections`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      inspectionType: 'DOT',
      inspectionDate: '2026-06-13',
      inspectorName: 'E2E Inspector',
      certificateNumber: 'DOT-E2E-001',
      passed: true,
      expiryDate: '2027-06-13',
      notes: 'DOT inspection passed',
    },
  })
  expect(inspectionResponse.status()).toBe(201)
  const inspection = await inspectionResponse.json()
  expect(inspection).toMatchObject({
    inspectionType: 'DOT',
    inspectorName: 'E2E Inspector',
    certificateNumber: 'DOT-E2E-001',
    passed: true,
  })

  const detailResponse = await request.get(`/api/assets/${asset.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(detailResponse.ok()).toBeTruthy()
  const detail = await detailResponse.json()
  expect(detail.currentAssignee.id).toBe(fixture.user.id)
  expect(detail.purchasedFromVendor.id).toBe(fixture.vendorId)
  expect(detail.statusDefinition.id).toBe(status.id)
  expect(detail.customFieldValues[0]).toMatchObject({
    fieldDefinitionId: customField.id,
    value: 'Earthwork',
  })
  expect(detail.maintenanceRecords[0].title).toBe('E2E Oil and hydraulic service')
  expect(detail.inspections[0].inspectionType).toBe('DOT')
})

test('captures meter readings on issues, bundles issues into work orders, records comments, and exposes QR issue log', async ({ request }) => {
  const token = await loginToken(request)
  const asset = await createAsset(request, token)

  const issueResponse = await request.post(`/api/assets/${asset.id}/issues`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: 'E2E hydraulic leak',
      description: 'Hydraulic fluid visible under machine',
      urgency: 'URGENT',
      meterReadingType: 'HOURS',
      meterReadingValue: 430,
    },
  })
  expect(issueResponse.status()).toBe(201)
  const issue = await issueResponse.json()
  expect(issue).toMatchObject({
    title: 'E2E hydraulic leak',
    urgency: 'URGENT',
    status: 'OPEN',
  })
  expect(issue.meterReading).toMatchObject({
    readingType: 'HOURS',
    value: 430,
  })

  const issueCommentResponse = await request.post(`/api/assets/issues/${issue.id}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      content: 'E2E issue comment for work-order handoff',
    },
  })
  expect(issueCommentResponse.status()).toBe(201)
  const issueComment = await issueCommentResponse.json()
  expect(issueComment.content).toBe('E2E issue comment for work-order handoff')

  const workOrderResponse = await request.post('/api/work-orders', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: 'E2E repair hydraulic leak',
      description: 'Bundle issue into repair order',
      scheduledDate: '2026-06-14',
      estimatedDuration: 4,
      actualDuration: 3.75,
      estimatedCost: 1_250,
      actualCost: 1_175,
      assignedToId: fixture.user.id,
      issueIds: [issue.id],
    },
  })
  expect(workOrderResponse.status()).toBe(201)
  const workOrder = await workOrderResponse.json()
  expect(workOrder).toMatchObject({
    title: 'E2E repair hydraulic leak',
    status: 'SCHEDULED',
    estimatedDuration: 4,
    actualDuration: 3.75,
    estimatedCost: 1_250,
    actualCost: 1_175,
  })
  expect(workOrder.assignedTo.id).toBe(fixture.user.id)
  expect(workOrder.issues).toHaveLength(1)
  expect(workOrder.issues[0].issue.id).toBe(issue.id)

  const listedIssuesResponse = await request.get(`/api/assets/${asset.id}/issues?status=IN_PROGRESS`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(listedIssuesResponse.ok()).toBeTruthy()
  const listedIssues = await listedIssuesResponse.json()
  expect(listedIssues.some((listedIssue: { id: string }) => listedIssue.id === issue.id)).toBe(true)

  const workOrderCommentResponse = await request.post(`/api/work-orders/${workOrder.id}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      content: 'E2E work order schedule confirmed',
    },
  })
  expect(workOrderCommentResponse.status()).toBe(201)
  const workOrderComment = await workOrderCommentResponse.json()
  expect(workOrderComment.content).toBe('E2E work order schedule confirmed')

  const completedResponse = await request.patch(`/api/work-orders/${workOrder.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      status: 'COMPLETED',
      actualDuration: 3.5,
      actualCost: 1_100,
    },
  })
  expect(completedResponse.ok()).toBeTruthy()
  const completed = await completedResponse.json()
  expect(completed).toMatchObject({
    status: 'COMPLETED',
    actualDuration: 3.5,
    actualCost: 1_100,
  })

  const resolvedIssuesResponse = await request.get(`/api/assets/${asset.id}/issues?status=RESOLVED`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(resolvedIssuesResponse.ok()).toBeTruthy()
  const resolvedIssues = await resolvedIssuesResponse.json()
  expect(resolvedIssues.some((resolvedIssue: { id: string }) => resolvedIssue.id === issue.id)).toBe(true)

  const shareResponse = await request.post(`/api/assets/${asset.id}/share`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {},
  })
  expect(shareResponse.status()).toBe(200)
  const share = await shareResponse.json()
  expect(share.shareToken).toBeTruthy()
  expect(share.shareUrl).toContain(`/shared/asset/${share.shareToken}`)

  const publicLogResponse = await request.get(`/api/shared/asset/${share.shareToken}`)
  expect(publicLogResponse.ok()).toBeTruthy()
  const publicLog = await publicLogResponse.json()
  expect(publicLog.asset).toMatchObject({
    id: asset.id,
    name: 'E2E Excavator 310',
    make: 'CAT',
    model: '310',
  })

  const publicIssueResponse = await request.post(`/api/shared/asset/${share.shareToken}`, {
    data: {
      title: 'E2E QR reported tire issue',
      description: 'Submitted from shared issue log',
      reporterName: 'QR Reporter',
      urgency: 'HIGH',
    },
  })
  expect(publicIssueResponse.status()).toBe(201)
  await expect(publicIssueResponse.json()).resolves.toEqual({ success: true })

  const refreshedPublicLogResponse = await request.get(`/api/shared/asset/${share.shareToken}`)
  expect(refreshedPublicLogResponse.ok()).toBeTruthy()
  const refreshedPublicLog = await refreshedPublicLogResponse.json()
  expect(refreshedPublicLog.issues.some((publicIssue: { title: string }) => publicIssue.title === 'E2E QR reported tire issue')).toBe(true)
})

test('creates an asset and edits identity, assignment, purchase, status, and custom fields in the UI', async ({ page, request }) => {
  const token = await loginToken(request)

  const statusResponse = await request.post('/api/asset-statuses', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'E2E UI Ready',
      baseStatus: 'AVAILABLE',
      color: '#16a34a',
    },
  })
  expect(statusResponse.status()).toBe(201)
  const status = await statusResponse.json()

  const customFieldResponse = await request.post('/api/asset-custom-fields', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name: 'E2E UI Fleet Category',
      fieldType: 'SELECT',
      selectOptions: ['Earthwork', 'Concrete'],
    },
  })
  expect(customFieldResponse.status()).toBe(201)

  await login(page, fixture.user.email, fixture.user.password)
  await page.goto('/dashboard/assets/new')

  await page.getByLabel(/Asset Name/).fill('E2E UI Loader 544')
  await page.getByLabel('Status *', { exact: true }).selectOption('IN_USE')
  await page.getByLabel('Status *', { exact: true }).selectOption(`custom:${status.id}`)
  await page.getByLabel(/Asset Type/).selectOption('EQUIPMENT')
  await page.getByLabel(/Serial Number/).fill('E2E-UI-SN-544')
  await page.getByLabel(/Make/).fill('CAT')
  await page.getByLabel(/Model/).fill('544')
  await page.getByLabel(/Year/).fill('2025')
  await page.getByLabel(/VIN/).fill('VIN-E2E-UI-544')
  await page.getByLabel(/License Plate/).fill('UI544')
  await page.getByLabel(/Description/).fill('Created through Playwright asset UI')
  await page.getByRole('button', { name: '+ Add yard', exact: true }).click()
  await page.getByLabel('New yard name').fill('Yard B')
  await page.getByRole('button', { name: 'Save yard', exact: true }).click()
  await expect(page.getByLabel('Location (job or yard)').locator('option:checked')).toHaveText('Yard B')
  await page.getByLabel(/Purchase Cost/).fill('135000')
  await page.getByLabel(/Additional Notes/).fill('Initial UI-created asset notes')
  await page.getByRole('button', { name: 'Create Asset' }).click()

  await page.waitForURL('**/dashboard/assets/**')
  await expect(page.getByRole('heading', { name: 'E2E UI Loader 544' })).toBeVisible()
  await expect(page.getByText('SN: E2E-UI-SN-544')).toBeVisible()
  await expect(page.getByText('E2E UI Ready')).toBeVisible()
  await expect(page.getByText('$135,000')).toBeVisible()

  const assetUrl = page.url()
  const assetId = assetUrl.split('/').filter(Boolean).pop()
  expect(assetId).toBeTruthy()

  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('button', { name: 'New Custom Status' }).click()
  let modal = modalByTitle(page, 'New Custom Status')
  await fieldByLabel(modal, 'Status Name').fill('E2E UI Awaiting Parts')
  await fieldByLabel(modal, 'Base Status').selectOption('UNDER_MAINTENANCE')
  await modal.getByRole('button', { name: 'Create Status' }).click()
  await expect(modal).toHaveCount(0)

  await page.getByRole('button', { name: 'Add Custom Field' }).click()
  modal = modalByTitle(page, 'Add Custom Field')
  await fieldByLabel(modal, 'Field Name').fill('E2E UI Service Region')
  await fieldByLabel(modal, 'Field Type').selectOption('SELECT')
  await fieldByLabel(modal, 'Dropdown Options').fill('West\nEast')
  await modal.getByRole('button', { name: 'Create Field' }).click()
  await expect(modal).toHaveCount(0)

  await fieldByLabel(page.locator('body'), 'Name').fill('E2E UI Loader 544 Updated')
  await fieldByLabel(page.locator('body'), 'Assignment (person)').selectOption(fixture.user.id)
  await fieldByLabel(page.locator('body'), 'Status Note').fill('Ready for ACA dispatch')
  await fieldByLabel(page.locator('body'), 'E2E UI Fleet Category').selectOption('Earthwork')
  await fieldByLabel(page.locator('body'), 'E2E UI Service Region').selectOption('West')
  await page.getByRole('button', { name: 'Save Changes' }).click()

  await expect(page.getByRole('heading', { name: 'E2E UI Loader 544 Updated' })).toBeVisible()
  await expect(page.getByText('E2E UI Awaiting Parts')).toBeVisible()
  await expect(page.getByText('Ready for ACA dispatch')).toBeVisible()
  await expect(page.getByText(`(${fixture.user.email})`)).toBeVisible()
  await expect(page.getByText('E2E UI Fleet Category')).toBeVisible()
  await expect(page.getByText('Earthwork')).toBeVisible()
  await expect(page.getByText('E2E UI Service Region')).toBeVisible()
  await expect(page.getByText('West')).toBeVisible()

  await page.getByRole('button', { name: 'Purchase' }).click()
  await page.getByRole('button', { name: 'Edit' }).click()
  await fieldByLabel(page.locator('body'), 'Purchased From (Vendor)').selectOption(fixture.vendorId)
  await fieldByLabel(page.locator('body'), 'PO Number').fill('E2E-UI-PO-544')
  await fieldByLabel(page.locator('body'), 'Invoice Number').fill('E2E-UI-INV-544')
  await fieldByLabel(page.locator('body'), 'Financing Type').selectOption('FINANCED')
  await fieldByLabel(page.locator('body'), 'Financed Amount').fill('100000')
  await fieldByLabel(page.locator('body'), 'Lender').fill('E2E UI Equipment Finance')
  await fieldByLabel(page.locator('body'), 'Loan Term (months)').fill('48')
  await fieldByLabel(page.locator('body'), 'Depreciation Method').fill('Straight line')
  await fieldByLabel(page.locator('body'), 'Useful Life (years)').fill('7')
  await fieldByLabel(page.locator('body'), 'Salvage Value').fill('20000')
  await page.getByRole('button', { name: 'Save Changes' }).click()

  await expect(page.getByText('E2E Vendor Company')).toBeVisible()
  await expect(page.getByText('E2E-UI-PO-544')).toBeVisible()
  await expect(page.getByText('E2E-UI-INV-544')).toBeVisible()
  await expect(page.getByText('FINANCED', { exact: true })).toBeVisible()
  await expect(page.getByText('E2E UI Equipment Finance')).toBeVisible()
  await expect(page.getByText('48 months')).toBeVisible()
  await expect(page.getByText('Straight line')).toBeVisible()

  const detailResponse = await request.get(`/api/assets/${assetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(detailResponse.ok()).toBeTruthy()
  const detail = await detailResponse.json()
  expect(detail).toMatchObject({
    name: 'E2E UI Loader 544 Updated',
    make: 'CAT',
    model: '544',
    year: 2025,
    currentAssigneeId: fixture.user.id,
    purchasedFromVendorId: fixture.vendorId,
    poNumber: 'E2E-UI-PO-544',
    invoiceNumber: 'E2E-UI-INV-544',
    financingType: 'FINANCED',
    financedAmount: 100_000,
  })
  expect(detail.customFieldValues.some((value: { value: string }) => value.value === 'Earthwork')).toBe(true)
})

test('drives rental, meter, job assignment, maintenance, DOT, and issue tabs from the UI', async ({ page, request }) => {
  const token = await loginToken(request)
  const asset = await createAsset(request, token)

  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/assets/${asset.id}`)
  await expect(page.getByRole('heading', { name: 'E2E Excavator 310' })).toBeVisible()

  await page.getByRole('button', { name: 'Rental Pricing' }).click()
  await page.getByRole('button', { name: 'Update Rates' }).click()
  let modal = modalByTitle(page, 'Update Rental Rates')
  await fieldByLabel(modal, 'Hourly Rate').fill('150')
  await fieldByLabel(modal, 'Daily Rate').fill('900')
  await fieldByLabel(modal, 'Monthly Rate').fill('18000')
  await fieldByLabel(modal, 'Notes').fill('Initial UI rental rate')
  await modal.getByRole('button', { name: 'Save Rates' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('$150')).toBeVisible()

  await page.getByRole('button', { name: 'Update Rates' }).click()
  modal = modalByTitle(page, 'Update Rental Rates')
  await fieldByLabel(modal, 'Hourly Rate').fill('175')
  await fieldByLabel(modal, 'Daily Rate').fill('1000')
  await fieldByLabel(modal, 'Monthly Rate').fill('20000')
  await fieldByLabel(modal, 'Notes').fill('Updated UI rental rate')
  await modal.getByRole('button', { name: 'Save Rates' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('$175')).toBeVisible()
  await page.getByRole('button', { name: /Show history/ }).click()
  await expect(page.getByText('$150')).toBeVisible()

  await page.getByRole('button', { name: 'Meter Reads' }).click()
  await page.getByRole('button', { name: 'Log Reading' }).click()
  modal = modalByTitle(page, 'Log Meter Reading')
  await expect(modal.getByText('Saved readings are kept in dated sequence')).toBeVisible()
  await fieldByLabel(modal, 'Meter Type (Hours or Miles)').selectOption('HOURS')
  await fieldByLabel(modal, 'Hour Meter Reading').fill('420.5')
  await fieldByLabel(modal, 'Notes').fill('UI morning check')
  await modal.getByRole('button', { name: 'Log Reading' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('420.5')).toBeVisible()
  await expect(page.getByText('UI morning check')).toBeVisible()

  await page.getByRole('button', { name: 'Locations' }).click()
  await page.getByRole('button', { name: 'Set Location' }).click()
  modal = modalByTitle(page, 'Set Location')
  await modal.getByLabel('Location (job or yard)').selectOption(`project:${fixture.projectId}`)
  await fieldByLabel(modal, 'Arrival Date').fill('2026-06-14')
  await fieldByLabel(modal, 'Departure Date').fill('2026-06-16')
  await fieldByLabel(modal, 'Notes').fill('UI assigned to ACA project')
  await modal.getByRole('button', { name: 'Save Location' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('UI assigned to ACA project')).toBeVisible()

  const uiAssignmentsResponse = await request.get(`/api/assets/${asset.id}/job-assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(uiAssignmentsResponse.ok()).toBeTruthy()
  const uiAssignments = await uiAssignmentsResponse.json()
  const uiAssignment = uiAssignments.find((assignment: { notes: string | null }) => assignment.notes === 'UI assigned to ACA project')
  expect(uiAssignment.assignedAt).toContain('2026-06-14')
  expect(uiAssignment.removedAt).toContain('2026-06-16')

  await page.getByRole('button', { name: 'Maintenance & Service' }).click()
  await page.getByRole('button', { name: 'Log Record' }).click()
  modal = modalByTitle(page, 'Log Service / Maintenance Record')
  await fieldByLabel(modal, 'Title').fill('UI oil and hydraulic service')
  await fieldByLabel(modal, 'Service Type').selectOption('OIL_CHANGE')
  await fieldByLabel(modal, 'Quantity').fill('12')
  await fieldByLabel(modal, 'Unit').fill('qt')
  await fieldByLabel(modal, 'Meter Reading at Service').fill('421')
  await fieldByLabel(modal, 'Cost').fill('325')
  await fieldByLabel(modal, 'Notes').fill('Oil, fuel, hydraulic filters checked in UI')
  await modal.getByRole('button', { name: 'Log Record' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('UI oil and hydraulic service')).toBeVisible()
  await expect(page.getByText('Oil Change')).toBeVisible()

  await page.getByRole('button', { name: 'Log Inspection' }).click()
  modal = modalByTitle(page, 'Log Inspection')
  await fieldByLabel(modal, 'Type').selectOption('DOT')
  await fieldByLabel(modal, 'Result').selectOption('true')
  await fieldByLabel(modal, 'Inspector Name').fill('UI DOT Inspector')
  await fieldByLabel(modal, 'Certificate Number').fill('DOT-UI-001')
  await fieldByLabel(modal, 'Notes').fill('DOT inspection logged through UI')
  await modal.getByRole('button', { name: 'Log Inspection' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('UI DOT Inspector')).toBeVisible()
  await expect(page.getByText('DOT-UI-001')).toBeVisible()
  await expect(page.getByText('Passed')).toBeVisible()

  await page.getByRole('button', { name: 'Issues' }).click()
  await page.getByRole('button', { name: 'Log Issue' }).click()
  modal = modalByTitle(page, 'Log an Issue')
  await fieldByLabel(modal, 'Title').fill('UI hydraulic leak')
  await fieldByLabel(modal, 'Description').fill('Hydraulic fluid visible under machine')
  await fieldByLabel(modal, 'Urgency').selectOption('URGENT')
  await fieldByLabel(modal, 'Initial Issue Status').selectOption('OPEN')
  await expect(modal.getByText('Every issue captures')).toBeVisible()
  await modal.getByLabel('Issue meter type').selectOption('HOURS')
  await modal.getByPlaceholder('Hour meter').fill('430')
  await expect(modal.getByText('Notification Routing')).toBeVisible()
  const staffSettingsResponse = page.waitForResponse((response) =>
    response.url().includes('/api/asset-issue-notification-settings') &&
    response.request().method() === 'PATCH'
  )
  await modal.getByLabel('Notify staff').click()
  await expect((await staffSettingsResponse).ok()).toBeTruthy()
  const recipientSettingsResponse = page.waitForResponse((response) =>
    response.url().includes('/api/asset-issue-notification-settings') &&
    response.request().method() === 'PATCH'
  )
  await modal.getByLabel(new RegExp(`${fixture.user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)).click()
  await expect((await recipientSettingsResponse).ok()).toBeTruthy()
  await modal.getByRole('button', { name: 'Log Issue' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('UI hydraulic leak')).toBeVisible()
  await expect(page.getByText('URGENT')).toBeVisible()
  await expect(page.getByText('430 hours at time of report')).toBeVisible()

  await page.getByRole('button', { name: /UI hydraulic leak/ }).click()
  await page.getByPlaceholder('Add a comment...').fill('UI issue comment added')
  const commentResponse = page.waitForResponse((response) =>
    response.url().includes('/api/assets/issues/') &&
    response.url().includes('/comments') &&
    response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Post' }).click()
  await expect((await commentResponse).ok()).toBeTruthy()

  await page.goto('/dashboard/assets/work-orders')
  await page.getByRole('button', { name: 'New Work Order' }).click()
  modal = modalByTitle(page, 'New Work Order')
  await fieldByLabel(modal, 'Title').fill('UI repair hydraulic leak')
  await fieldByLabel(modal, 'Estimated Duration (hrs)').fill('4')
  await fieldByLabel(modal, 'Actual Duration (hrs)').fill('3.5')
  await fieldByLabel(modal, 'Estimated Cost').fill('1250')
  await fieldByLabel(modal, 'Actual Cost').fill('1100')
  await modal.getByLabel(/UI hydraulic leak/).check()
  await modal.getByRole('button', { name: 'Create Work Order' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'UI repair hydraulic leak' })).toBeVisible()

  await page.goto(`/dashboard/assets/${asset.id}`)
  await page.getByRole('button', { name: 'QR Code' }).click()
  modal = modalByTitle(page, 'Issue Log QR Code')
  await expect(modal.getByRole('button', { name: 'Print' })).toBeDisabled()
  await expect(modal.getByRole('button', { name: 'Download' })).toBeDisabled()
  const shareResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/assets/${asset.id}/share`) &&
    response.request().method() === 'POST'
  )
  await modal.getByRole('button', { name: 'Generate QR Code' }).click()
  await expect((await shareResponse).ok()).toBeTruthy()
  await expect(modal.getByRole('button', { name: 'Print' })).toBeEnabled()
  await expect(modal.getByRole('button', { name: 'Download' })).toBeEnabled()

  const ratesResponse = await request.get(`/api/assets/${asset.id}/rental-rates`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(ratesResponse.ok()).toBeTruthy()
  const rates = await ratesResponse.json()
  expect(rates).toHaveLength(2)

  const meterResponse = await request.get(`/api/assets/${asset.id}/meter-readings`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(meterResponse.ok()).toBeTruthy()
  const meterReadings = await meterResponse.json()
  expect(meterReadings.some((reading: { value: number }) => reading.value === 420.5)).toBe(true)

  const assignmentsResponse = await request.get(`/api/assets/${asset.id}/job-assignments`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(assignmentsResponse.ok()).toBeTruthy()
  const assignments = await assignmentsResponse.json()
  expect(assignments.some((assignment: { notes: string | null }) => assignment.notes === 'UI assigned to ACA project')).toBe(true)

  const issuesResponse = await request.get(`/api/assets/${asset.id}/issues`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(issuesResponse.ok()).toBeTruthy()
  const issues = await issuesResponse.json()
  expect(issues.some((issue: { title: string; _count?: { comments: number } }) => issue.title === 'UI hydraulic leak' && (issue._count?.comments ?? 0) > 0)).toBe(true)

  const detailResponse = await request.get(`/api/assets/${asset.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(detailResponse.ok()).toBeTruthy()
  const detail = await detailResponse.json()
  expect(detail.maintenanceRecords.some((record: { title: string }) => record.title === 'UI oil and hydraulic service')).toBe(true)
  expect(detail.inspections.some((inspection: { certificateNumber: string | null }) => inspection.certificateNumber === 'DOT-UI-001')).toBe(true)
})
