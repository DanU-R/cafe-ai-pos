<?php

use App\Models\Order;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

it('shows accurate dashboard summary from completed orders', function () {
    $user = User::factory()->create(['name' => 'Kasir Dashboard']);

    $completedOrder = Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'POS-20260521-1001',
        'total' => 27000,
        'paid_amount' => 60000,
        'change_amount' => 33000,
        'payment_method' => 'cash',
        'status' => 'completed',
        'created_at' => now()->subMinute(),
        'updated_at' => now()->subMinute(),
    ]);

    $completedOrder->items()->create([
        'product_id' => null,
        'product_name' => 'Dashboard Latte',
        'price' => 15000,
        'qty' => 2,
        'subtotal' => 30000,
    ]);

    $pendingOrder = Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'POS-20260521-1002',
        'total' => 50000,
        'paid_amount' => 50000,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'status' => 'pending',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $pendingOrder->items()->create([
        'product_id' => null,
        'product_name' => 'Pending Tea',
        'price' => 50000,
        'qty' => 5,
        'subtotal' => 250000,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('summary.revenue', '27000.00')
            ->where('summary.transactions_count', 1)
            ->has('recentOrders', 1)
            ->where('recentOrders.0.order_code', 'POS-20260521-1001')
            ->where('recentOrders.0.user.name', 'Kasir Dashboard')
            ->has('topProducts', 1)
            ->where('topProducts.0.product_name', 'Dashboard Latte')
            ->where('topProducts.0.qty_sold', 2)
            ->where('topProducts.0.revenue', '30000.00'),
        );
});
