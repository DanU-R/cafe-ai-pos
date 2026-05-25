<?php

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

it('allows admin to view sales report with discounts and top products', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $order = Order::query()->create([
        'user_id' => $admin->id,
        'order_code' => 'POS-20260522-REPORT',
        'subtotal_amount' => 50000,
        'discount_amount' => 5000,
        'total' => 45000,
        'paid_amount' => 50000,
        'change_amount' => 5000,
        'payment_method' => 'cash',
        'status' => 'completed',
        'created_at' => now(),
    ]);
    $order->items()->create([
        'product_id' => null,
        'product_name' => 'Report Latte',
        'price' => 25000,
        'qty' => 2,
        'subtotal' => 50000,
    ]);

    $this->actingAs($admin)
        ->get(route('reports.sales', ['date' => now()->toDateString()]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/sales')
            ->where('summary.gross_sales', '50000')
            ->where('summary.discounts', '5000')
            ->where('summary.net_sales', '45000')
            ->where('summary.transactions', 1)
            ->where('topProducts.0.product_name', 'Report Latte')
            ->where('topProducts.0.sold_qty', 2),
        );
});

it('blocks cashier from admin reports and product management', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);

    $this->actingAs($cashier)
        ->get(route('reports.sales'))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->get(route('products.index'))
        ->assertForbidden();
});

it('keeps cashier access to POS and order history', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);

    $this->actingAs($cashier)
        ->get(route('pos.index'))
        ->assertOk();

    $this->actingAs($cashier)
        ->get(route('orders.index'))
        ->assertOk();
});

it('stores checkout discount and calculates paid change from net total', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $category = Category::query()->create(['name' => 'Discount Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Discount Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 12000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    CashierShift::query()->create([
        'user_id' => $cashier->id,
        'shift_code' => 'SHIFT-DISCOUNT-001',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'status' => 'open',
    ]);

    User::factory()->create([
        'role' => 'admin',
        'manager_pin_hash' => Hash::make('123456'),
    ]);

    $this->actingAs($cashier)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'discount_amount' => 5000,
            'manager_pin' => '123456',
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->firstOrFail();

    expect($order->subtotal_amount)->toBe('40000.00')
        ->and($order->discount_amount)->toBe('5000.00')
        ->and($order->total)->toBe('35000.00')
        ->and($order->change_amount)->toBe('15000.00');
});

it('rejects checkout discount bigger than subtotal', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $category = Category::query()->create(['name' => 'Discount Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Discount Too Big Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 12000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    CashierShift::query()->create([
        'user_id' => $cashier->id,
        'shift_code' => 'SHIFT-DISCOUNT-002',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'status' => 'open',
    ]);

    $this->actingAs($cashier)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'discount_amount' => 50000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors('discount_amount');
});

it('shows stock movement report and exports csv', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::query()->create(['name' => 'Movement Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Movement Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 12000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    StockMovement::query()->create([
        'product_id' => $product->id,
        'user_id' => $admin->id,
        'type' => 'restock',
        'qty' => 3,
        'stock_before' => 2,
        'stock_after' => 5,
        'note' => 'CSV Test',
    ]);

    $this->actingAs($admin)
        ->get(route('reports.stock-movements.index', ['date' => now()->toDateString()]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/stock-movements')
            ->where('summary.restock_qty', 3)
            ->where('summary.movement_count', 1)
            ->where('movements.0.product_name', 'Movement Latte'),
        );

    $this->actingAs($admin)
        ->get(route('reports.stock-movements.export', ['date' => now()->toDateString()]))
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');
});
