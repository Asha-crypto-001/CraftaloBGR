import { defineConfig, devices } from '@playwright/test';

const basePath = process.env.VITE_BASE_PATH ?? '/craftalo-pages-test/';
const previewUrl = `http://127.0.0.1:4175${basePath}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/pages-deployment.spec.ts',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: previewUrl,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-pages',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : 'chrome',
      },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4175 --strictPort',
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
