<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->category = Category::query()->create(['name' => 'Minuman Testing']);
});

it('redirects guests from pos routes to login', function (string $method, string $routeName) {
    $response = $method === 'post'
        ? $this->post(route($routeName), [])
        : $this->get(route($routeName));

    $response->assertRedirect(route('login'));
})->with([
    ['get', 'pos.index'],
    ['post', 'pos.checkout'],
]);

it('allows an authenticated user to view the pos page', function () {
    Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Es Kopi Susu Testing',
        'description' => 'Produk aktif untuk kasir.',
        'price' => 18000,
        'is_active' => true,
    ]);

    Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Produk Nonaktif Testing',
        'description' => null,
        'price' => 10000,
        'is_active' => false,
    ]);

    $this->actingAs($this->user)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pos/index')
            ->has('categories', 1)
            ->has('products', 1)
            ->where('products.0.name', 'Es Kopi Susu Testing'),
        );
});

it('checks out successfully and creates order with order items', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Es Kopi Susu Testing',
        'description' => null,
        'price' => 18000,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->firstOrFail();

    expect(config('database.connections.mysql.database'))->toBe('cafe_ai_pos_testing')
        ->and($order->user_id)->toBe($this->user->id)
        ->and($order->order_code)->toStartWith('POS-'.now()->format('Ymd').'-')
        ->and($order->total)->toBe('36000.00')
        ->and($order->paid_amount)->toBe('50000.00')
        ->and($order->change_amount)->toBe('14000.00')
        ->and($order->payment_method)->toBe('cash')
        ->and($order->status)->toBe('completed')
        ->and($order->items)->toHaveCount(1)
        ->and($order->items->first()->product_name)->toBe('Es Kopi Susu Testing')
        ->and($order->items->first()->price)->toBe('18000.00')
        ->and($order->items->first()->qty)->toBe(2)
        ->and($order->items->first()->subtotal)->toBe('36000.00');
});

it('fails checkout when cart is empty', function () {
    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'items' => [],
        ])
        ->assertSessionHasErrors('items');

    expect(Order::query()->count())->toBe(0);
});

it('fails checkout when paid amount is less than server total', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Nasi Goreng Testing',
        'description' => null,
        'price' => 25000,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 20000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors('paid_amount');

    expect(Order::query()->count())->toBe(0);
});

it('fails checkout when product is inactive', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Produk Nonaktif Testing',
        'description' => null,
        'price' => 15000,
        'is_active' => false,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 20000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors('items');

    expect(Order::query()->count())->toBe(0);
});

it('calculates subtotal and total from database instead of frontend input', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Kentang Goreng Testing',
        'description' => null,
        'price' => 18000,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 20000,
            'total' => 1,
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 1,
                    'price' => 1,
                    'subtotal' => 1,
                ],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->with('items')->firstOrFail();
    $item = $order->items->first();

    expect($order->total)->toBe('18000.00')
        ->and($order->change_amount)->toBe('2000.00')
        ->and($item->price)->toBe('18000.00')
        ->and($item->subtotal)->toBe('18000.00');
});
