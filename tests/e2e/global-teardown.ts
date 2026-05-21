import { execFileSync } from 'node:child_process';

const e2eEnv = {
    ...process.env,
    APP_ENV: 'e2e',
    APP_URL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:8000',
    DB_CONNECTION: 'mysql',
    DB_HOST: process.env.E2E_DB_HOST ?? '127.0.0.1',
    DB_PORT: process.env.E2E_DB_PORT ?? '3306',
    DB_DATABASE: process.env.E2E_DB_DATABASE ?? 'cafe_ai_pos_e2e',
    DB_USERNAME: process.env.E2E_DB_USERNAME ?? 'root',
    DB_PASSWORD: process.env.E2E_DB_PASSWORD ?? '',
    SESSION_DRIVER: 'database',
    CACHE_STORE: 'database',
    QUEUE_CONNECTION: 'sync',
    MAIL_MAILER: 'array',
};

async function globalTeardown(): Promise<void> {
    execFileSync(
        'php',
        [
            'artisan',
            'tinker',
            '--execute',
            String.raw`DB::transaction(function () { DB::table('order_items')->whereIn('order_id', DB::table('orders')->where('order_code', 'like', 'POS-%')->pluck('id'))->delete(); DB::table('orders')->where('order_code', 'like', 'POS-%')->delete(); DB::table('products')->where('name', 'like', 'QA E2E%')->delete(); DB::table('categories')->where('name', 'like', 'QA E2E%')->delete(); DB::table('users')->where('email', 'qa.e2e.cashier@example.test')->delete(); });`,
        ],
        {
            env: e2eEnv,
            stdio: 'inherit',
        },
    );
}

export default globalTeardown;
