import { expect, test } from '@playwright/test'

// Set by playwright.config.js from the publishable key the build embeds.
const clerkHost = process.env.E2E_CLERK_HOST ?? ''
const realClerk = clerkHost !== '' && !clerkHost.endsWith('.invalid')

test.beforeEach(async ({ page }) => {
  // No backend in these tests: every API call answers 503, and pages must still render.
  await page.route('**/api/**', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"no backend in e2e"}' }))
  // Keep the run independent of Google; the map test checks the embed's address only.
  await page.route(/^https:\/\/(www\.)?google\.com\//, (route) => route.abort())
  if (!realClerk) await page.route((url) => url.hostname === clerkHost, (route) => route.abort())
})

test.describe('public pages', () => {
  test('home page shows the club and its booking call to action', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/40 Love/i)
    await expect(page.getByRole('link', { name: 'Book a court' }).first()).toBeVisible()
  })

  for (const [path, title] of [
    ['/courts', 'The courts.'],
    ['/pricing', 'Court rates.'],
    ['/gallery', 'The photo book.'],
    ['/contact', 'Visit the club.'],
  ]) {
    test(`${path} renders its heading`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    })
  }

  test('matchmaking page renders without a backend', async ({ page }) => {
    await page.goto('/matchmaking')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('the location map embeds Google Maps only when asked', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(0)
    await page.getByText('Show the location map').click()
    await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(1)
  })

  test('switching to Arabic turns the page right-to-left and back', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'التبديل إلى العربية' }).first().click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
    await page.getByRole('button', { name: 'Switch to English' }).first().click()
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  })

  test('an unknown address returns to the home page', async ({ page }) => {
    await page.goto('/no-such-page')
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('with Clerk loaded', () => {
  test.skip(!realClerk, 'Needs the real Clerk publishable key (frontend/.env locally, repository variable in CI)')

  test('a visitor opening a member page is sent to sign in', async ({ page }) => {
    await page.goto('/book')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('a visitor opening the admin area is sent to the admin sign-in', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  // The sign-in and sign-up pages wait for Clerk before showing anything.
  test('sign-in and sign-up pages render their shells', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Join the club.' })).toBeVisible()
  })

  test('the sign-in form from Clerk appears', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 15_000 })
  })
})
