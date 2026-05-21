import { execFileSync } from 'node:child_process';
import { expect, type Page, test } from '@playwright/test';

const qaPrefix = 'QA E2E';
const cashierEmail = 'qa.e2e.cashier@example.test';
const cashierPassword = 'password';
const categoryName = `${qaPrefix} Drinks`;
const firstProductName = `${qaPrefix} Latte`;
const secondProductName = `${qaPrefix} Tea`;

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

function artisan(args: string[]): string {
    return execFileSync('php', ['artisan', ...args], {
        env: e2eEnv,
        encoding: 'utf8',
    });
}

function cleanupQaData(): void {
    artisan([
        'tinker',
        '--execute',
        String.raw`DB::transaction(function () { $orderIds = DB::table('orders')->where('order_code', 'like', 'POS-%')->pluck('id'); DB::table('order_items')->whereIn('order_id', $orderIds)->delete(); DB::table('orders')->whereIn('id', $orderIds)->delete(); DB::table('products')->where('name', 'like', 'QA E2E%')->delete(); DB::table('categories')->where('name', 'like', 'QA E2E%')->delete(); });`,
    ]);
}

async function visit(page: Page, path: string): Promise<void> {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
}

test.beforeEach(() => {
    cleanupQaData();
});

test.afterEach(() => {
    cleanupQaData();
});

test('cashier can complete POS checkout from browser UI and data is stored in database', async ({ page }) => {
    test.setTimeout(60_000);

    await visit(page, '/login');
    await page.getByLabel('Email address').fill(cashierEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill(cashierPassword);
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.waitForLoadState('domcontentloaded');
    await visit(page, '/categories/create');
    await page.getByLabel('Nama kategori').fill(categoryName);
    await page.getByRole('button', { name: 'Simpan kategori' }).click();
    await expect(page).toHaveURL(/\/categories$/);
    await expect(page.getByText(categoryName)).toBeVisible();

    await visit(page, '/products/create');
    await page.getByRole('combobox', { name: 'Kategori' }).click();
    await page.getByRole('option', { name: categoryName }).click();
    await page.getByLabel('Nama produk').fill(firstProductName);
    await page.getByLabel('Deskripsi').fill('Produk QA E2E untuk flow browser POS.');
    await page.getByLabel('Harga').fill('15000');
    await page.getByRole('button', { name: 'Simpan produk' }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByText(firstProductName)).toBeVisible();

    await visit(page, '/products/create');
    await page.getByRole('combobox', { name: 'Kategori' }).click();
    await page.getByRole('option', { name: categoryName }).click();
    await page.getByLabel('Nama produk').fill(secondProductName);
    await page.getByLabel('Deskripsi').fill('Produk QA E2E kedua untuk cart POS.');
    await page.getByLabel('Harga').fill('12000');
    await page.getByRole('button', { name: 'Simpan produk' }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByText(secondProductName)).toBeVisible();

    await visit(page, '/pos');
    await expect(page.getByRole('heading', { name: 'Kasir/POS' })).toBeVisible();
    await page.getByRole('button', { name: categoryName }).click();
    await expect(page.getByText(firstProductName).first()).toBeVisible();
    await expect(page.getByText(secondProductName).first()).toBeVisible();

    await page.locator('[data-slot="card"]').filter({ hasText: firstProductName }).getByRole('button', { name: 'Tambah ke cart' }).click();
    await page.locator('[data-slot="card"]').filter({ hasText: secondProductName }).getByRole('button', { name: 'Tambah ke cart' }).click();
    await page.getByLabel(`Tambah ${firstProductName}`).click();
    await page.getByLabel(`Kurangi ${firstProductName}`).click();

    await expect(page.getByText('Total belanja')).toBeVisible();
    await expect(page.getByText('Rp 27.000')).toBeVisible();
    await page.getByLabel('Uang bayar').fill('60000');
    await expect(page.getByText('Rp 33.000')).toBeVisible();
    await page.getByRole('button', { name: 'Checkout' }).click();

    await expect(page.getByText('Checkout berhasil')).toBeVisible();
    await expect(page.getByText(/Order berhasil disimpan dengan kode POS-\d{8}-\d{4}\./)).toBeVisible();
    await expect(page.getByText('Cart masih kosong')).toBeVisible();

    const result = artisan([
        'tinker',
        '--execute',
        String.raw`$order = App\Models\Order::with('items')->latest('id')->first(); echo json_encode(['order_code' => $order?->order_code, 'total' => $order?->total, 'paid_amount' => $order?->paid_amount, 'change_amount' => $order?->change_amount, 'items_count' => $order?->items->count(), 'product_names' => $order?->items->pluck('product_name')->values()->all()]);`,
    ]);

    const jsonLine = result.trim().split('\n').pop();
    expect(jsonLine).toBeTruthy();

    const order = JSON.parse(jsonLine ?? '{}') as {
        order_code?: string;
        total?: string;
        paid_amount?: string;
        change_amount?: string;
        items_count?: number;
        product_names?: string[];
    };

    expect(order.order_code).toMatch(/^POS-\d{8}-\d{4}$/);
    expect(order.total).toBe('27000.00');
    expect(order.paid_amount).toBe('60000.00');
    expect(order.change_amount).toBe('33000.00');
    expect(order.items_count).toBe(2);
    expect(order.product_names).toEqual(expect.arrayContaining([firstProductName, secondProductName]));
});
