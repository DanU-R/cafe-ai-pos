<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

it('allows admin to manage cashier users and reset password', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->has('users'),
        );

    $this->actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'Kasir Baru',
            'email' => 'kasir-baru@example.test',
            'role' => 'cashier',
            'password' => 'password-baru',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    $cashier = User::query()->where('email', 'kasir-baru@example.test')->firstOrFail();

    expect($cashier->role)->toBe('cashier')
        ->and(Hash::check('password-baru', $cashier->password))->toBeTrue();

    $this->actingAs($admin)
        ->put(route('users.update', $cashier), [
            'name' => 'Kasir Update',
            'email' => 'kasir-update@example.test',
            'role' => 'admin',
            'password' => 'password-update',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    $cashier->refresh();

    expect($cashier->name)->toBe('Kasir Update')
        ->and($cashier->email)->toBe('kasir-update@example.test')
        ->and($cashier->role)->toBe('admin')
        ->and(Hash::check('password-update', $cashier->password))->toBeTrue();
});

it('blocks cashier from user management profit report and low stock report', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);

    $this->actingAs($cashier)
        ->get(route('users.index'))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->get(route('reports.profit'))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->get(route('reports.low-stock.index'))
        ->assertForbidden();
});

it('stores product cost price from product management', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::query()->create(['name' => 'HPP Category']);

    $this->actingAs($admin)
        ->post(route('products.store'), [
            'category_id' => $category->id,
            'name' => 'HPP Latte',
            'description' => 'Produk dengan HPP.',
            'price' => 20000,
            'cost_price' => 12000,
            'stock' => 8,
            'minimum_stock' => 2,
            'is_active' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->where('name', 'HPP Latte')->firstOrFail();

    expect($product->cost_price)->toBe('12000.00');
});

it('shows profit report from net sales minus product cost', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::query()->create(['name' => 'Profit Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Profit Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 12000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $order = Order::query()->create([
        'user_id' => $admin->id,
        'order_code' => 'POS-20260522-PROFIT',
        'subtotal_amount' => 40000,
        'discount_amount' => 5000,
        'total' => 35000,
        'paid_amount' => 50000,
        'change_amount' => 15000,
        'payment_method' => 'cash',
        'status' => 'completed',
        'created_at' => now(),
    ]);

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'price' => 20000,
        'qty' => 2,
        'subtotal' => 40000,
    ]);

    $this->actingAs($admin)
        ->get(route('reports.profit', ['date' => now()->toDateString()]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/profit')
            ->where('summary.gross_sales', '40000.00')
            ->where('summary.discounts', '5000.00')
            ->where('summary.net_sales', '35000.00')
            ->where('summary.cost', '24000.00')
            ->where('summary.profit', '11000.00')
            ->where('products.0.product_name', 'Profit Latte')
            ->where('products.0.sold_qty', 2)
            ->where('products.0.cost', '24000.00')
            ->where('products.0.profit', '16000.00'),
        );
});

it('shows low stock filters and exports restock csv', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::query()->create(['name' => 'Stock Alert Category']);

    Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Empty Stock Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 12000,
        'stock' => 0,
        'minimum_stock' => 5,
        'is_active' => true,
    ]);
    Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Low Stock Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 12000,
        'stock' => 2,
        'minimum_stock' => 5,
        'is_active' => true,
    ]);
    Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Safe Stock Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 12000,
        'stock' => 8,
        'minimum_stock' => 5,
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->get(route('reports.low-stock.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/low-stock')
            ->where('summary.low_stock_count', 1)
            ->where('summary.empty_stock_count', 1)
            ->where('summary.suggested_restock_total', 8)
            ->where('products.0.name', 'Empty Stock Latte')
            ->where('products.1.name', 'Low Stock Latte'),
        );

    $this->actingAs($admin)
        ->get(route('reports.low-stock.index', ['status' => 'empty']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products', 1)
            ->where('products.0.name', 'Empty Stock Latte'),
        );

    $this->actingAs($admin)
        ->get(route('reports.low-stock.export'))
        ->assertOk()
        ->assertHeader('content-type', 'text/csv; charset=UTF-8');
});
