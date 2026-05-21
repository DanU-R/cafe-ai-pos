<?php

use App\Models\Order;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function createOrderWithItem(User $user): Order
{
    $order = Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'POS-20260521-9999',
        'total' => 27000,
        'paid_amount' => 60000,
        'change_amount' => 33000,
        'payment_method' => 'cash',
        'status' => 'completed',
    ]);

    $order->items()->create([
        'product_id' => null,
        'product_name' => 'Snapshot Latte Testing',
        'price' => 15000,
        'qty' => 1,
        'subtotal' => 15000,
    ]);

    $order->items()->create([
        'product_id' => null,
        'product_name' => 'Snapshot Tea Testing',
        'price' => 12000,
        'qty' => 1,
        'subtotal' => 12000,
    ]);

    return $order;
}

it('redirects guests from orders index to login', function () {
    $this->get(route('orders.index'))
        ->assertRedirect(route('login'));
});

it('redirects guests from order detail to login', function () {
    $user = User::factory()->create();
    $order = createOrderWithItem($user);

    $this->get(route('orders.show', $order))
        ->assertRedirect(route('login'));
});

it('allows an authenticated user to view order history', function () {
    $user = User::factory()->create(['name' => 'Kasir Testing']);
    createOrderWithItem($user);

    $this->actingAs($user)
        ->get(route('orders.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/index')
            ->has('orders.data', 1)
            ->where('orders.data.0.order_code', 'POS-20260521-9999')
            ->where('orders.data.0.user.name', 'Kasir Testing')
            ->where('orders.data.0.total', '27000.00')
            ->where('orders.data.0.paid_amount', '60000.00')
            ->where('orders.data.0.change_amount', '33000.00')
            ->where('orders.data.0.payment_method', 'cash')
            ->where('orders.data.0.status', 'completed'),
        );
});

it('allows an authenticated user to view order detail', function () {
    $user = User::factory()->create(['name' => 'Kasir Detail Testing']);
    $order = createOrderWithItem($user);

    $this->actingAs($user)
        ->get(route('orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/show')
            ->where('order.order_code', 'POS-20260521-9999')
            ->where('order.user.name', 'Kasir Detail Testing')
            ->where('order.total', '27000.00')
            ->where('order.paid_amount', '60000.00')
            ->where('order.change_amount', '33000.00')
            ->where('order.payment_method', 'cash')
            ->where('order.status', 'completed')
            ->has('order.items', 2),
        );
});

it('shows order detail item snapshot product name and price', function () {
    $user = User::factory()->create();
    $order = createOrderWithItem($user);

    $this->actingAs($user)
        ->get(route('orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('order.items.0.product_name', 'Snapshot Latte Testing')
            ->where('order.items.0.price', '15000.00')
            ->where('order.items.0.qty', 1)
            ->where('order.items.0.subtotal', '15000.00'),
        );
});
