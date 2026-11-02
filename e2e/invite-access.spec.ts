import { expect, test } from '@playwright/test'

test('opens a valid invitation without requiring a sign-in', async ({ page }) => {
  await page.route('**/api/invite/test-invitation', route => route.fulfill({ json: {
    invite: {
      id: 'invite', email: 'new@example.test', firstName: 'New', lastName: 'Member', role: 'STAFF',
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      company: { name: 'Example Construction', appName: 'BuildFlo' },
      invitedBy: { firstName: 'Team', lastName: 'Admin' },
    },
  } }))
  await page.goto('/invite/test-invitation')
  await expect(page).toHaveURL(/\/invite\/test-invitation$/)
  await expect(page.getByRole('heading', { name: 'Join BuildFlo' })).toBeVisible()
  await expect(page.getByLabel('Create Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept Invitation', exact: true })).toBeEnabled()
})

test('shows the invitation error instead of redirecting recipients to sign-in', async ({ page }) => {
  await page.route('**/api/invite/expired-invitation', route => route.fulfill({ status: 404, json: { error: 'Invalid or expired invitation' } }))
  await page.goto('/invite/expired-invitation')
  await expect(page).toHaveURL(/\/invite\/expired-invitation$/)
  await expect(page.getByRole('heading', { name: 'Invalid Invitation' })).toBeVisible()
  await expect(page.getByText('Invalid or expired invitation', { exact: true })).toBeVisible()
})
