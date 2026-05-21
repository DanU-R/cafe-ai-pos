<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;

it('uses the dedicated mysql testing database for order model tests', function () {
    expect(config('database.default'))->toBe('mysql')
        ->and(config('database.connections.mysql.database'))->toBe('cafe_ai_pos_testing')
        ->and(config('database.connections.mysql.database'))->not->toBe('cafe_ai_pos');
});

it('stores orders with items and keeps product snapshot data', function () {
    $user = User::factory()->create();

    $category = Category::create([
        'name' => 'Minuman Testing',
    ]);

    $product = Product::create([
        'category_id' => $category->id,
        'name' => 'Es Kopi Susu Gula Aren',
        'description' => 'Kopi susu untuk testing order.',
        'price' => 18000,
        'is_active' => true,
    ]);

    $order = Order::create([
        'user_id' => $user->id,
        'order_code' => 'ORD-TEST-001',
        'total' => 36000,
        'paid_amount' => 50000,
        'change_amount' => 14000,
        'payment_method' => 'cash',
        'status' => 'completed',
    ]);

    $orderItem = OrderItem::create([
        'order_id' => $order->id,
        'product_id' => $product->id,
        'product_name' => $product->name,
        'price' => $product->price,
        'qty' => 2,
        'subtotal' => 36000,
    ]);

    expect($user->orders)->toHaveCount(1)
        ->and($order->user->is($user))->toBeTrue()
        ->and($order->items)->toHaveCount(1)
        ->and($orderItem->order->is($order))->toBeTrue()
        ->and($orderItem->product->is($product))->toBeTrue()
        ->and($product->orderItems)->toHaveCount(1);

    $product->update([
        'name' => 'Es Kopi Susu Baru',
        'price' => 20000,
    ]);

    $orderItem->refresh();

    expect($orderItem->product_name)->toBe('Es Kopi Susu Gula Aren')
        ->and($orderItem->price)->toBe('18000.00');

    $product->delete();

    $orderItem->refresh();

    expect($orderItem->product_id)->toBeNull()
        ->and($orderItem->product_name)->toBe('Es Kopi Susu Gula Aren')
        ->and($orderItem->price)->toBe('18000.00');
});
