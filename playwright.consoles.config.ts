import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: 'consoles.spec.ts',
    workers: 1,
    timeout: 60_000,
    reporter: 'list',
    use: { baseURL: 'http://localhost:3217', ...devices['Desktop Chrome'] },
    webServer: [
        { command: 'node tests/fixtures/console-api.mjs', url: 'http://127.0.0.1:43210/api/health/', reuseExistingServer: false },
        { command: 'npm run dev', url: 'http://localhost:3217/search', timeout: 120_000,
            reuseExistingServer: false, env: { FRONTEND_PORT: '3217', API_URL: 'http://127.0.0.1:43210/api', NEXT_PUBLIC_API_URL: 'http://127.0.0.1:43210/api', REVALIDATE_TOKEN: 'console-test-token' } },
    ],
});
