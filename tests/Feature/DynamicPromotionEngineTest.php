<?php

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->category = Category::query()->create(['name' => 'Phase 4 Category']);

    CashierShift::query()->create([
        'user_id' => $this->user->id,
        'shift_code' => 'SHIFT-'.now()->format('Ymd').'-0001',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'expected_cash' => 100000,
        'status' => 'open',
    ]);
});

it('applies happy hour promotion only inside configured day and time window', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Happy Hour Latte',
        'description' => null,
        'price' => 20000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    Promotion::query()->create([
        'name' => 'Happy Hour',
        'code' => 'HAPPY10',
        'type' => 'percent',
        'promo_type' => 'happy_hour',
        'value' => 10,
        'minimum_spend' => 0,
        'start_time' => now()->subHour()->format('H:i'),
        'end_time' => now()->addHour()->format('H:i'),
        'active_days' => [strtolower(now()->englishDayOfWeek)],
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'promotion_code' => 'HAPPY10',
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->firstOrFail();

    expect($order->subtotal_amount)->toBe('40000.00')
        ->and($order->discount_amount)->toBe('4000.00')
        ->and($order->total)->toBe('36000.00')
        ->and($order->promotion_code)->toBe('HAPPY10')
        ->and($product->refresh()->stock)->toBe(3);
});

it('applies bogo promotion using cheapest eligible units', function () {
    $firstProduct = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'BOGO Coffee',
        'description' => null,
        'price' => 30000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $secondProduct = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'BOGO Tea',
        'description' => null,
        'price' => 20000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    Promotion::query()->create([
        'name' => 'Category BOGO',
        'code' => 'BOGO4',
        'type' => 'fixed',
        'promo_type' => 'bogo',
        'target_id' => $this->category->id,
        'value' => 0,
        'minimum_spend' => 0,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 100000,
            'promotion_code' => 'BOGO4',
            'items' => [
                ['product_id' => $firstProduct->id, 'qty' => 1],
                ['product_id' => $secondProduct->id, 'qty' => 3],
            ],
        ])
        ->assertSessionHasNoErrors();

    $order = Order::query()->firstOrFail();

    expect($order->subtotal_amount)->toBe('90000.00')
        ->and($order->discount_amount)->toBe('40000.00')
        ->and($order->total)->toBe('50000.00')
        ->and($firstProduct->refresh()->stock)->toBe(4)
        ->and($secondProduct->refresh()->stock)->toBe(2);
});

it('keeps checkout stock mutation atomic and rejects negative stock', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Locked Stock Espresso',
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
