import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.FRONTEND_PORT ?? '3001';
const EXTERNAL_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const BASE_URL = EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'list',
    timeout: 30_000,
    use: {
        baseURL: BASE_URL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: EXTERNAL_BASE_URL ? undefined : {
        command: 'npm run dev',
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
