import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

// The build embeds VITE_CLERK_PUBLISHABLE_KEY (a public key). Locally it comes from .env; in CI from the
// repository variable, or else a placeholder whose host ends in .invalid. With the placeholder, Clerk never
// loads, tests that need it are skipped, and the public-page tests run fully offline.
const PLACEHOLDER_KEY = 'pk_test_ZTJlLmNsZXJrLmludmFsaWQk' // decodes to "e2e.clerk.invalid$"
const key = loadEnv('production', process.cwd(), 'VITE_').VITE_CLERK_PUBLISHABLE_KEY || PLACEHOLDER_KEY
const encoded = key.split('_')[2] ?? ''
process.env.E2E_CLERK_HOST = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '')

const port = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    env: { VITE_CLERK_PUBLISHABLE_KEY: key },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
