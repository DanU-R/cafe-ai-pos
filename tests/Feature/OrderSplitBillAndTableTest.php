<?php

use App\Models\Category;
use App\Models\DiningTable;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductModifier;
use App\Models\User;

function phase3Order(User $user, DiningTable $table, string $status = 'pending'): Order
{
    return Order::query()->create([
        'user_id' => $user->id,
        'dining_table_id' => $table->id,
        'order_code' => 'POS-'.now()->format('Ymd').'-'.fake()->unique()->numberBetween(1000, 9999),
        'subtotal_amount' => 0,
        'discount_amount' => 0,
        'tax_amount' => 0,
        'service_charge_amount' => 0,
        'total' => 0,
        'paid_amount' => 0,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'service_type' => 'dine_in',
        'status' => $status,
        'kitchen_status' => 'queued',
    ]);
}

function phase3Product(): Product
{
    $category = Category::query()->create(['name' => 'Phase 3 Category '.fake()->unique()->word()]);

    return Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Phase 3 Product '.fake()->unique()->word(),
        'description' => null,
        'price' => 10000,
        'stock' => 10,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
}

it('moves table to available table and updates table states', function () {
    $user = User::factory()->create();
    $source = DiningTable::query()->create(['name' => 'T1', 'capacity' => 2, 'status' => 'occupied', 'is_active' => true]);
    $destination = DiningTable::query()->create(['name' => 'T2', 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
    $order = phase3Order($user, $source);

    $this->actingAs($user)
        ->patch(route('orders.move-table', $order), ['dining_table_id' => $destination->id])
        ->assertRedirect(route('orders.show', $order))
        ->assertSessionHasNoErrors();

    expect($order->refresh()->dining_table_id)->toBe($destination->id)
        ->and($source->refresh()->status)->toBe('available')
        ->and($destination->refresh()->status)->toBe('occupied');

    $this->assertDatabaseHas('audit_logs', [
        'event' => 'order.move_table',
        'auditable_id' => $order->id,
    ]);
});

it('rejects moving table to occupied destination or non active order', function () {
    $user = User::factory()->create();
    $source = DiningTable::query()->create(['name' => 'T3', 'capacity' => 2, 'status' => 'occupied', 'is_active' => true]);
    $occupied = DiningTable::query()->create(['name' => 'T4', 'capacity' => 4, 'status' => 'occupied', 'is_active' => true]);
    $available = DiningTable::query()->create(['name' => 'T5', 'capacity' => 4, 'status' => 'available', 'is_active' => true]);
    $order = phase3Order($user, $source);
    phase3Order($user, $occupied);

    $this->actingAs($user)
        ->patch(route('orders.move-table', $order), ['dining_table_id' => $occupied->id])
        ->assertSessionHasErrors('dining_table_id');

    $order->update(['status' => 'completed']);

    $this->actingAs($user)
        ->patch(route('orders.move-table', $order), ['dining_table_id' => $available->id])
        ->assertSessionHasErrors('order');
});

it('splits full item move, preserves modifiers, and recalculates totals', function () {
    $user = User::factory()->create();
    $table = DiningTable::query()->create(['name' => 'T6', 'capacity' => 2, 'status' => 'occupied', 'is_active' => true]);
    $product = phase3Product();
    $modifier = ProductModifier::query()->create(['product_id' => $product->id, 'name' => 'Extra Shot', 'price' => 5000, 'is_active' => true]);
    $order = phase3Order($user, $table);
    $itemA = $order->items()->create(['product_id' => $product->id, 'product_name' => 'Latte', 'price' => 15000, 'qty' => 1, 'subtotal' => 15000]);
    $itemA->modifiers()->create(['product_modifier_id' => $modifier->id, 'name' => 'Extra Shot', 'price' => 5000]);
    $order->items()->create(['product_id' => $product->id, 'product_name' => 'Tea', 'price' => 10000, 'qty' => 1, 'subtotal' => 10000]);
    $order->update(['subtotal_amount' => 25000, 'discount_amount' => 2500, 'tax_amount' => 2250, 'service_charge_amount' => 1125, 'total' => 25875]);

    $this->actingAs($user)
        ->post(route('orders.split-bill', $order), ['items' => [['order_item_id' => $itemA->id, 'qty' => 1]]])
        ->assertSessionHasNoErrors();

    $child = Order::query()->where('id', '!=', $order->id)->firstOrFail();

    expect($itemA->refresh()->order_id)->toBe($child->id)
        ->and($itemA->modifiers)->toHaveCount(1)
        ->and($order->refresh()->subtotal_amount)->toBe('10000.00')
        ->and($order->discount_amount)->toBe('1000.00')
        ->and($order->tax_amount)->toBe('900.00')
        ->and($order->service_charge_amount)->toBe('450.00')
        ->and($order->total)->toBe('10350.00')
        ->and($child->refresh()->subtotal_amount)->toBe('15000.00')
        ->and($child->discount_amount)->toBe('1500.00')
        ->and($child->tax_amount)->toBe('1350.00')
        ->and($child->service_charge_amount)->toBe('675.00')
        ->and($child->total)->toBe('15525.00');
});

it('splits partial quantity, duplicates modifiers, and recalculates totals', function () {
    $user = User::factory()->create();
    $table = DiningTable::query()->create(['name' => 'T7', 'capacity' => 2, 'status' => 'occupied', 'is_active' => true]);
    $product = phase3Product();
    $modifier = ProductModifier::query()->create(['product_id' => $product->id, 'name' => 'Oat Milk', 'price' => 3000, 'is_active' => true]);
    $order = phase3Order($user, $table);
    $item = $order->items()->create(['product_id' => $product->id, 'product_name' => 'Cappuccino', 'price' => 13000, 'qty' => 3, 'subtotal' => 39000]);
    $item->modifiers()->create(['product_modifier_id' => $modifier->id, 'name' => 'Oat Milk', 'price' => 3000]);
    $order->update(['subtotal_amount' => 39000, 'discount_amount' => 3900, 'tax_amount' => 3510, 'service_charge_amount' => 1755, 'total' => 40365]);

    $this->actingAs($user)
        ->post(route('orders.split-bill', $order), ['items' => [['order_item_id' => $item->id, 'qty' => 1]]])
        ->assertSessionHasNoErrors();

    $child = Order::query()->where('id', '!=', $order->id)->firstOrFail();
    $childItem = $child->items()->with('modifiers')->firstOrFail();

    expect($item->refresh()->qty)->toBe(2)
        ->and($item->subtotal)->toBe('26000.00')
        ->and($childItem->qty)->toBe(1)
        ->and($childItem->subtotal)->toBe('13000.00')
        ->and($childItem->modifiers)->toHaveCount(1)
        ->and($childItem->modifiers->first()->name)->toBe('Oat Milk')
        ->and($order->refresh()->subtotal_amount)->toBe('26000.00')
        ->and($order->total)->toBe('26910.00')
        ->and($child->refresh()->subtotal_amount)->toBe('13000.00')
        ->and($child->total)->toBe('13455.00');
});

it('rejects split bill invalid quantity and item outside parent order', function () {
    $user = User::factory()->create();
    $table = DiningTable::query()->create(['name' => 'T8', 'capacity' => 2, 'status' => 'occupied', 'is_active' => true]);
    $otherTable = DiningTable::query()->create(['name' => 'T9', 'capacity' => 2, 'status' => 'occupied', 'is_active' => true]);
    $product = phase3Product();
    $order = phase3Order($user, $table);
    $otherOrder = phase3Order($user, $otherTable);
    $item = $order->items()->create(['product_id' => $product->id, 'product_name' => 'Mocha', 'price' => 12000, 'qty' => 1, 'subtotal' => 12000]);
    $otherItem = $otherOrder->items()->create(['product_id' => $product->id, 'product_name' => 'Americano', 'price' => 10000, 'qty' => 1, 'subtotal' => 10000]);

    $this->actingAs($user)
        ->post(route('orders.split-bill', $order), ['items' => [['order_item_id' => $item->id, 'qty' => 2]]])
        ->assertSessionHasErrors('items');

    $this->actingAs($user)
        ->post(route('orders.split-bill', $order), ['items' => [['order_item_id' => $otherItem->id, 'qty' => 1]]])
        ->assertSessionHasErrors('items');
});
