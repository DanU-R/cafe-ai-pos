<?php

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

it('deducts raw materials during POS checkout and restores product plus materials on refund', function () {
    $user = User::factory()->create(['role' => 'admin']);
    $category = Category::query()->create(['name' => 'Recipe Test']);
    $material = RawMaterial::query()->create([
        'name' => 'Coffee Bean',
        'unit' => 'gram',
        'stock' => 100,
        'minimum_stock' => 10,
        'cost_per_unit' => 100,
        'is_active' => true,
    ]);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Recipe Latte',
        'description' => null,
        'price' => 20000,
        'cost_price' => 8000,
        'stock' => 10,
        'minimum_stock' => 2,
        'is_active' => true,
    ]);
    $product->recipes()->create([
        'raw_material_id' => $material->id,
        'qty' => 12.5,
    ]);
    CashierShift::query()->create([
        'user_id' => $user->id,
        'shift_code' => 'SHIFT-TEST-001',
        'opening_cash' => 100000,
        'status' => 'open',
        'opened_at' => now(),
    ]);

    $this->actingAs($user)
        ->post(route('pos.checkout'), [
            'paid_amount' => 50000,
            'discount_amount' => 0,
            'service_type' => 'takeaway',
            'payments' => [
                ['method' => 'cash', 'amount' => 40000, 'reference' => null],
            ],
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertRedirect(route('pos.index'));

    expect($product->refresh()->stock)->toBe(8)
        ->and((float) $material->refresh()->stock)->toBe(75.0);

    $order = Order::query()->with('items')->latest('id')->firstOrFail();

    $user->update(['manager_pin_hash' => Hash::make('123456')]);

    $this->actingAs($user)
        ->post(route('orders.refunds.store', $order), [
            'method' => 'cash',
            'reason' => 'QA refund',
            'manager_pin' => '123456',
            'items' => [
                ['order_item_id' => $order->items->first()->id, 'qty' => 1],
            ],
        ])
        ->assertRedirect(route('orders.show', $order));

    expect($product->refresh()->stock)->toBe(9)
        ->and((float) $material->refresh()->stock)->toBe(87.5)
        ->and($order->refresh()->status)->toBe('completed')
        ->and($order->refunds()->count())->toBe(1);
});

it('shows refund report for admins', function () {
    $user = User::factory()->create(['role' => 'admin']);
    $order = Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'POS-RF-001',
        'subtotal_amount' => 20000,
        'discount_amount' => 0,
        'total' => 20000,
        'paid_amount' => 20000,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'status' => 'completed',
    ]);
    $refund = $order->refunds()->create([
        'user_id' => $user->id,
        'refund_code' => 'RF-TEST-001',
        'amount' => 10000,
        'method' => 'cash',
        'reason' => 'Report QA',
    ]);
    $refund->items()->create([
        'order_item_id' => $order->items()->create([
            'product_id' => null,
            'product_name' => 'Refund Latte',
            'price' => 10000,
            'qty' => 1,
            'subtotal' => 10000,
        ])->id,
        'product_id' => null,
        'product_name' => 'Refund Latte',
        'qty' => 1,
        'amount' => 10000,
    ]);

    $this->actingAs($user)
        ->get(route('reports.refunds', ['date' => today()->toDateString()]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('reports/refunds')
            ->where('summary.amount', '10000.00')
            ->where('summary.refund_count', 1)
            ->where('refunds.0.refund_code', 'RF-TEST-001')
            ->where('refunds.0.items.0.product_name', 'Refund Latte'),
        );
});
