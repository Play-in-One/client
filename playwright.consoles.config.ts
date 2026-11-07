import { defineConfig, devices } from '@playwright/test';
import { CONSOLES_PUBLIC } from './src/lib/features';

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: 'consoles.spec.ts',
    workers: 1,
    timeout: 60_000,
    reporter: 'list',
    use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3217', ...devices['Desktop Chrome'] },
    webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : [
        // Public mode serves a published model; the staff preview, a draft.
        { command: 'node tests/fixtures/console-api.mjs', url: 'http://127.0.0.1:43210/api/health/', reuseExistingServer: false,
            env: { CONSOLE_FIXTURE_PUBLISHED: CONSOLES_PUBLIC ? '1' : '0' } },
        { command: 'npm run dev', url: 'http://localhost:3217/search', timeout: 120_000,
            reuseExistingServer: false, env: { FRONTEND_PORT: '3217', API_URL: 'http://127.0.0.1:43210/api', NEXT_PUBLIC_API_URL: 'http://127.0.0.1:43210/api', REVALIDATE_TOKEN: 'console-test-token' } },
    ],
});
