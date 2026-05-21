import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8000';
const e2eDatabase = process.env.E2E_DB_DATABASE ?? 'cafe_ai_pos_e2e';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    globalTeardown: './tests/e2e/global-teardown.ts',
    use: {
        baseURL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: {
        command:
            'php tests/e2e/bootstrap-e2e.php && npx concurrently -k -s first "php artisan serve --host=127.0.0.1 --port=8000 --env=e2e" "npm run dev -- --host 127.0.0.1"',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
            APP_ENV: 'e2e',
            APP_URL: baseURL,
            DB_CONNECTION: 'mysql',
            DB_HOST: process.env.E2E_DB_HOST ?? '127.0.0.1',
            DB_PORT: process.env.E2E_DB_PORT ?? '3306',
            DB_DATABASE: e2eDatabase,
            DB_USERNAME: process.env.E2E_DB_USERNAME ?? 'root',
            DB_PASSWORD: process.env.E2E_DB_PASSWORD ?? '',
            SESSION_DRIVER: 'database',
            CACHE_STORE: 'database',
            QUEUE_CONNECTION: 'sync',
            MAIL_MAILER: 'array',
        },
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
