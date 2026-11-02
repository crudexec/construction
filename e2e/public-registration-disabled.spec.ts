import { expect, test } from '@playwright/test'

test('rejects public company signup through the API, including valid-looking and authenticated requests', async ({ request }) => {
  const payload = {
    email: 'registration-disabled-check@example.test', password: 'unused-test-password',
    firstName: 'Disabled', lastName: 'Signup', companyName: 'Must not be created',
  }
  for (const authenticated of [false, true]) {
    const response = await request.post('/api/auth/register', {
      data: payload,
      headers: authenticated ? { Authorization: 'Bearer mock-ui-session', Cookie: 'auth-token=mock-ui-session' } : {},
    })
    expect(response.status()).toBe(403)
    expect(await response.json()).toMatchObject({ code: 'PUBLIC_REGISTRATION_DISABLED' })
    expect(response.headers()['set-cookie']).toBeUndefined()
  }
  const invalidBody = await request.post('/api/auth/register', { data: 'not-json', headers: { 'Content-Type': 'application/json' } })
  expect(invalidBody.status()).toBe(403)
})

for (const width of [1440, 390]) {
  test(`shows invitation guidance instead of company registration at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Join your team by invitation' })).toBeVisible()
    await expect(page.locator('form, input')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Sign in to an existing account' })).toHaveAttribute('href', '/login')
    await page.screenshot({ path: testInfo.outputPath('registration-disabled.png'), fullPage: true })
    await page.getByRole('link', { name: 'Sign in to an existing account' }).click()
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible()
    await expect(page.locator('a[href="/register"]')).toHaveCount(0)
    await expect(page.getByText('Joining a team? Open the invitation link sent by your company administrator.')).toBeVisible()
  })
}

test('removes self-service signup links from the public home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href="/register"]')).toHaveCount(0)
  const accessLinks = page.getByRole('link', { name: 'Request access' })
  await expect(accessLinks).toHaveCount(4)
  for (const link of await accessLinks.all()) await expect(link).toHaveAttribute('href', 'mailto:info@buildfloapp.com')
})
