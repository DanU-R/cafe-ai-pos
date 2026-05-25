<?php

use App\Models\AuditLog;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\RawMaterialMovement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('checks out with customer tax service charge points and audit log', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $customer = Customer::query()->create(['name' => 'Member Cafe', 'phone' => '0812345678']);
    $category = Category::query()->create(['name' => 'Tax Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Tax Latte',
        'price' => 50000,
        'stock' => 5,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    CashierShift::query()->create([
        'user_id' => $cashier->id,
        'shift_code' => 'SHIFT-TAX-001',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'status' => 'open',
    ]);

    $this->actingAs($cashier)
        ->post(route('pos.checkout'), [
            'customer_id' => $customer->id,
            'tax_percent' => 10,
            'service_charge_percent' => 5,
            'paid_amount' => 60000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::query()->firstOrFail();

    expect($order->customer_id)->toBe($customer->id)
        ->and($order->tax_amount)->toBe('5000.00')
        ->and($order->service_charge_amount)->toBe('2500.00')
        ->and($order->total)->toBe('57500.00')
        ->and($order->kitchen_status)->toBe('queued')
        ->and($customer->refresh()->points)->toBe(5)
        ->and(AuditLog::query()->where('event', 'order.checkout')->count())->toBe(1);
});

it('updates kitchen status and records audit log', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $order = Order::query()->create([
        'user_id' => $cashier->id,
        'order_code' => 'POS-KDS-001',
        'subtotal_amount' => 20000,
        'discount_amount' => 0,
        'tax_amount' => 0,
        'service_charge_amount' => 0,
        'total' => 20000,
        'paid_amount' => 20000,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'status' => 'completed',
        'kitchen_status' => 'queued',
    ]);
    $order->items()->create([
        'product_name' => 'KDS Latte',
        'price' => 20000,
        'qty' => 1,
        'subtotal' => 20000,
    ]);

    $this->actingAs($cashier)
        ->get(route('kitchen.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('kitchen/index')
            ->where('orders.0.order_code', 'POS-KDS-001'),
        );

    $this->actingAs($cashier)
        ->patch(route('kitchen.orders.update', $order), ['kitchen_status' => 'preparing'])
        ->assertRedirect();

    expect($order->refresh()->kitchen_status)->toBe('preparing')
        ->and(AuditLog::query()->where('event', 'order.kitchen_status_updated')->count())->toBe(1);
});

it('records raw material wastage with movement and audit log', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $material = RawMaterial::query()->create([
        'name' => 'Susu Tumpah',
        'unit' => 'ml',
        'stock' => 1000,
        'minimum_stock' => 100,
        'cost_per_unit' => 100,
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->post(route('wastage.store'), [
            'raw_material_id' => $material->id,
            'qty' => 125,
            'note' => 'Tumpah saat produksi',
        ])
        ->assertRedirect(route('raw-materials.index'));

    expect($material->refresh()->stock)->toBe('875.000')
        ->and(RawMaterialMovement::query()->where('type', 'wastage')->count())->toBe(1)
        ->and(AuditLog::query()->where('event', 'raw_material.wastage')->count())->toBe(1);
});
