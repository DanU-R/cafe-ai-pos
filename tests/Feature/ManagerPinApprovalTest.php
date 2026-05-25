<?php

use App\Models\AuditLog;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

function pinCashier(): User
{
    return User::factory()->create(['role' => 'cashier']);
}

function pinApprover(string $pin = '123456', string $role = 'admin'): User
{
    return User::factory()->create([
        'role' => $role,
        'manager_pin_hash' => Hash::make($pin),
    ]);
}

function pinProduct(): Product
{
    $category = Category::query()->create(['name' => 'PIN Test']);

    return Product::query()->create([
        'category_id' => $category->id,
        'name' => 'PIN Latte',
        'price' => 20000,
        'cost_price' => 8000,
        'stock' => 10,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
}

function openPinShift(User $user): void
{
    CashierShift::query()->create([
        'user_id' => $user->id,
        'shift_code' => 'SHIFT-PIN-'.$user->id,
        'opened_at' => now(),
        'opening_cash' => 100000,
        'expected_cash' => 100000,
        'status' => 'open',
    ]);
}

function pinOrder(User $user, Product $product): Order
{
    $order = Order::query()->create([
        'user_id' => $user->id,
        'order_code' => 'PIN-ORDER-'.$user->id,
        'subtotal_amount' => 40000,
        'discount_amount' => 0,
        'total' => 40000,
        'paid_amount' => 40000,
        'change_amount' => 0,
        'payment_method' => 'cash',
        'status' => 'completed',
    ]);

    $order->items()->create([
        'product_id' => $product->id,
        'product_name' => $product->name,
        'price' => 20000,
        'qty' => 2,
        'subtotal' => 40000,
    ]);

    return $order;
}

it('rejects cashier manual discount checkout without valid manager pin', function (): void {
    $cashier = pinCashier();
    pinApprover('123456');
    openPinShift($cashier);
    $product = pinProduct();

    $payload = [
        'paid_amount' => 20000,
        'discount_amount' => 1000,
        'items' => [['product_id' => $product->id, 'qty' => 1]],
    ];

    $this->actingAs($cashier)->post(route('pos.checkout'), $payload)
        ->assertSessionHasErrors('manager_pin');

    $this->actingAs($cashier)->post(route('pos.checkout'), $payload + ['manager_pin' => '000000'])
        ->assertSessionHasErrors('manager_pin');

    expect(Order::query()->count())->toBe(0);
});

it('allows cashier manual discount checkout with valid admin pin and audits approval', function (): void {
    $cashier = pinCashier();
    pinApprover('123456');
    openPinShift($cashier);
    $product = pinProduct();

    $this->actingAs($cashier)->post(route('pos.checkout'), [
        'paid_amount' => 20000,
        'discount_amount' => 1000,
        'manager_pin' => '123456',
        'items' => [['product_id' => $product->id, 'qty' => 1]],
    ])->assertRedirect(route('pos.index'));

    expect(Order::query()->count())->toBe(1)
        ->and(AuditLog::query()->where('event', 'manager_pin.approved')->where('new_values->action', 'pos.manual_discount')->exists())->toBeTrue();
});

it('requires valid manager pin for cashier order cancellation', function (): void {
    $cashier = pinCashier();
    pinApprover('123456');
    $product = pinProduct();
    $order = pinOrder($cashier, $product);

    $this->actingAs($cashier)->patch(route('orders.cancel', $order))
        ->assertSessionHasErrors('manager_pin');

    $this->actingAs($cashier)->patch(route('orders.cancel', $order), ['manager_pin' => '000000'])
        ->assertSessionHasErrors('manager_pin');

    $this->actingAs($cashier)->patch(route('orders.cancel', $order), ['manager_pin' => '123456'])
        ->assertRedirect(route('orders.show', $order));

    expect($order->refresh()->status)->toBe('cancelled')
        ->and(AuditLog::query()->where('new_values->action', 'order.cancel')->exists())->toBeTrue();
});

it('requires valid manager pin for cashier refund', function (): void {
    $cashier = pinCashier();
    pinApprover('123456', 'manager');
    $product = pinProduct();
    $order = pinOrder($cashier, $product);
    $item = $order->items()->firstOrFail();

    $payload = [
        'method' => 'cash',
        'reason' => 'PIN refund',
        'items' => [['order_item_id' => $item->id, 'qty' => 1]],
    ];

    $this->actingAs($cashier)->post(route('orders.refunds.store', $order), $payload)
        ->assertSessionHasErrors('manager_pin');

    $this->actingAs($cashier)->post(route('orders.refunds.store', $order), $payload + ['manager_pin' => '000000'])
        ->assertSessionHasErrors('manager_pin');

    $this->actingAs($cashier)->post(route('orders.refunds.store', $order), $payload + ['manager_pin' => '123456'])
        ->assertRedirect(route('orders.show', $order));

    expect($order->refunds()->count())->toBe(1)
        ->and(AuditLog::query()->where('new_values->action', 'order.refund')->exists())->toBeTrue();
});
