<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
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
            ->where('orders.data.0.status', 'completed')
            ->where('filters.search', '')
            ->where('filters.status', ''),
        );
});

it('filters order history by search and status', function () {
    $user = User::factory()->create(['name' => 'Kasir Filter Testing']);
    createOrderWithItem($user);

    Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'POS-20260521-PENDING',
        'total' => 12000,
        'paid_amount' => 12000,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'status' => 'pending',
    ]);

    $this->actingAs($user)
        ->get(route('orders.index', [
            'search' => '9999',
            'status' => 'completed',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/index')
            ->has('orders.data', 1)
            ->where('orders.data.0.order_code', 'POS-20260521-9999')
            ->where('orders.data.0.status', 'completed')
            ->where('filters.search', '9999')
            ->where('filters.status', 'completed'),
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

it('cancels completed order, restores stock, and records cancel movement', function () {
    $user = User::factory()->create(['name' => 'Kasir Cancel Testing']);
    $category = Category::query()->create(['name' => 'Cancel Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Cancel Latte Testing',
        'description' => null,
        'price' => 15000,
        'stock' => 1,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $order = Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'POS-20260521-CANCEL',
        'total' => 30000,
        'paid_amount' => 50000,
        'change_amount' => 20000,
        'payment_method' => 'cash',
        'status' => 'completed',
    ]);

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'price' => 15000,
        'qty' => 2,
        'subtotal' => 30000,
    ]);

    $user->update(['manager_pin_hash' => Hash::make('123456')]);

    $this->actingAs($user)
        ->patch(route('orders.cancel', $order), ['manager_pin' => '123456'])
        ->assertRedirect(route('orders.show', $order))
        ->assertSessionHas('success');

    $movement = StockMovement::query()->firstOrFail();

    expect($order->refresh()->status)->toBe('cancelled')
        ->and($product->refresh()->stock)->toBe(3)
        ->and($movement->product_id)->toBe($product->id)
        ->and($movement->user_id)->toBe($user->id)
        ->and($movement->type)->toBe('cancel')
        ->and($movement->qty)->toBe(2)
        ->and($movement->stock_before)->toBe(1)
        ->and($movement->stock_after)->toBe(3)
        ->and($movement->note)->toBe('POS-20260521-CANCEL');
});

it('does not restore stock twice when order is already cancelled', function () {
    $user = User::factory()->create();
    $category = Category::query()->create(['name' => 'Cancel Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Already Cancelled Latte',
        'description' => null,
        'price' => 15000,
        'stock' => 3,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $order = Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'POS-20260521-CANCELLED',
        'total' => 30000,
        'paid_amount' => 50000,
        'change_amount' => 20000,
        'payment_method' => 'cash',
        'status' => 'cancelled',
    ]);

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'price' => 15000,
        'qty' => 2,
        'subtotal' => 30000,
    ]);

    $this->actingAs($user)
        ->patch(route('orders.cancel', $order), ['manager_pin' => '123456'])
        ->assertRedirect(route('orders.show', $order));

    expect($product->refresh()->stock)->toBe(3)
        ->and(StockMovement::query()->count())->toBe(0);
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
