<?php

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->category = Category::query()->create(['name' => 'Minuman Testing']);

    CashierShift::query()->create([
        'user_id' => $this->user->id,
        'shift_code' => 'SHIFT-'.now()->format('Ymd').'-0001',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'expected_cash' => 100000,
        'status' => 'open',
    ]);
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
        'stock' => 8,
        'minimum_stock' => 2,
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
        'stock' => 5,
        'minimum_stock' => 1,
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
    $movement = StockMovement::query()->firstOrFail();

    expect($order->user_id)->toBe($this->user->id)
        ->and($order->order_code)->toStartWith('POS-'.now()->format('Ymd').'-')
        ->and($order->total)->toBe('36000.00')
        ->and($order->paid_amount)->toBe('50000.00')
        ->and($order->change_amount)->toBe('14000.00')
        ->and($order->payment_method)->toBe('cash')
        ->and($order->payments)->toHaveCount(1)
        ->and($order->payments->first()->method)->toBe('cash')
        ->and($order->payments->first()->amount)->toBe('50000.00')
        ->and($order->status)->toBe('completed')
        ->and($order->items)->toHaveCount(1)
        ->and($order->items->first()->product_name)->toBe('Es Kopi Susu Testing')
        ->and($order->items->first()->price)->toBe('18000.00')
        ->and($order->items->first()->qty)->toBe(2)
        ->and($order->items->first()->subtotal)->toBe('36000.00')
        ->and($product->refresh()->stock)->toBe(3)
        ->and($movement->product_id)->toBe($product->id)
        ->and($movement->user_id)->toBe($this->user->id)
        ->and($movement->type)->toBe('sale')
        ->and($movement->qty)->toBe(2)
        ->and($movement->stock_before)->toBe(5)
        ->and($movement->stock_after)->toBe(3)
        ->and($movement->note)->toBe($order->order_code);
});

it('supports mixed checkout payments', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Mixed Payment Latte Testing',
        'description' => null,
        'price' => 30000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'service_type' => 'takeaway',
            'payments' => [
                ['method' => 'cash', 'amount' => 10000],
                ['method' => 'qris', 'amount' => 20000, 'reference' => 'QR-001'],
            ],
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->with('payments')->firstOrFail();

    expect($order->payment_method)->toBe('mixed')
        ->and($order->paid_amount)->toBe('30000.00')
        ->and($order->change_amount)->toBe('0.00')
        ->and($order->payments)->toHaveCount(2)
        ->and($order->payments->pluck('method')->all())->toBe(['cash', 'qris']);

    $this->assertDatabaseHas('order_payments', [
        'order_id' => $order->id,
        'method' => 'qris',
        'amount' => '20000.00',
        'reference' => 'QR-001',
    ]);
});

it('creates sale stock movements for each checkout item', function () {
    $firstProduct = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Latte Sale Movement Testing',
        'description' => null,
        'price' => 15000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $secondProduct = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Tea Sale Movement Testing',
        'description' => null,
        'price' => 12000,
        'stock' => 4,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 60000,
            'items' => [
                ['product_id' => $firstProduct->id, 'qty' => 2],
                ['product_id' => $secondProduct->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->firstOrFail();

    expect(StockMovement::query()->count())->toBe(2)
        ->and($firstProduct->refresh()->stock)->toBe(3)
        ->and($secondProduct->refresh()->stock)->toBe(3);

    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $firstProduct->id,
        'user_id' => $this->user->id,
        'type' => 'sale',
        'qty' => 2,
        'stock_before' => 5,
        'stock_after' => 3,
        'note' => $order->order_code,
    ]);

    $this->assertDatabaseHas('stock_movements', [
        'product_id' => $secondProduct->id,
        'user_id' => $this->user->id,
        'type' => 'sale',
        'qty' => 1,
        'stock_before' => 4,
        'stock_after' => 3,
        'note' => $order->order_code,
    ]);
});

it('does not create sale stock movement when checkout validation fails', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'No Movement Testing',
        'description' => null,
        'price' => 18000,
        'stock' => 1,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertSessionHasErrors('items');

    expect(Order::query()->count())->toBe(0)
        ->and(StockMovement::query()->count())->toBe(0)
        ->and($product->refresh()->stock)->toBe(1);
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
        'stock' => 5,
        'minimum_stock' => 1,
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
        'stock' => 5,
        'minimum_stock' => 1,
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

it('rounds rupiah change consistently when total has float precision noise', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Rounding Precision Testing',
        'description' => null,
        'price' => 103000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 125000,
            'tax_percent' => 16.550485436893204,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->firstOrFail();

    expect($order->subtotal_amount)->toBe('103000.00')
        ->and($order->tax_amount)->toBe('17047.00')
        ->and($order->total)->toBe('120047.00')
        ->and($order->paid_amount)->toBe('125000.00')
        ->and($order->change_amount)->toBe('4953.00');
});

it('fails checkout when stock is less than requested qty', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Stok Terbatas Testing',
        'description' => null,
        'price' => 18000,
        'stock' => 1,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertSessionHasErrors('items');

    expect(Order::query()->count())->toBe(0)
        ->and($product->refresh()->stock)->toBe(1);
});

it('fails checkout when stock is zero', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Stok Habis Testing',
        'description' => null,
        'price' => 18000,
        'stock' => 0,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors('items');

    expect(Order::query()->count())->toBe(0)
        ->and($product->refresh()->stock)->toBe(0);
});
