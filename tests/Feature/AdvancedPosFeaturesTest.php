<?php

use App\Models\AuditLog;
use App\Models\CashDrawerMovement;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Order;
use App\Models\PosSetting;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function advancedAdmin(): User
{
    return User::factory()->create(['role' => 'admin']);
}

it('checks out with modifier and promotion', function (): void {
    $user = advancedAdmin();
    CashierShift::query()->create([
        'user_id' => $user->id,
        'shift_code' => 'SHIFT-ADV',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'expected_cash' => 100000,
        'status' => 'open',
    ]);

    $category = Category::query()->create(['name' => 'Coffee']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Latte',
        'price' => 30000,
        'cost_price' => 10000,
        'stock' => 10,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $modifier = $product->modifiers()->create(['name' => 'Extra Shot', 'price' => 5000, 'is_active' => true]);
    Promotion::query()->create(['name' => 'Promo 10K', 'code' => 'DISC10', 'type' => 'fixed', 'value' => 10000, 'minimum_spend' => 0, 'is_active' => true]);

    $this->actingAs($user)->post('/pos/checkout', [
        'paid_amount' => 50000,
        'promotion_code' => 'DISC10',
        'items' => [[
            'product_id' => $product->id,
            'qty' => 1,
            'modifier_ids' => [$modifier->id],
        ]],
    ])->assertRedirect('/pos');

    $order = Order::query()->with('items.modifiers')->firstOrFail();

    expect($order->subtotal_amount)->toBe('35000.00')
        ->and($order->discount_amount)->toBe('10000.00')
        ->and($order->total)->toBe('25000.00')
        ->and($order->promotion_code)->toBe('DISC10')
        ->and($order->items->first()->modifiers->first()->name)->toBe('Extra Shot');
});

it('records cash drawer movement and pos settings audit', function (): void {
    $user = advancedAdmin();
    CashierShift::query()->create([
        'user_id' => $user->id,
        'shift_code' => 'SHIFT-CASH',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'expected_cash' => 100000,
        'status' => 'open',
    ]);

    $this->actingAs($user)->post('/cash-drawer-movements', [
        'type' => 'cash_in',
        'amount' => 25000,
        'note' => 'Tambah modal',
    ])->assertRedirect();

    $this->actingAs($user)->put('/pos-settings', [
        'tax_percent' => 10,
        'service_charge_percent' => 5,
        'receipt_footer' => 'Terima kasih',
    ])->assertRedirect();

    expect(CashDrawerMovement::query()->where('type', 'cash_in')->count())->toBe(1)
        ->and(PosSetting::value('tax_percent'))->toBe('10')
        ->and(AuditLog::query()->where('event', 'cash_drawer.movement_created')->exists())->toBeTrue()
        ->and(AuditLog::query()->where('event', 'pos_settings.updated')->exists())->toBeTrue();
});

it('renders promotion and audit pages for admin', function (): void {
    $user = advancedAdmin();

    $this->actingAs($user)->get('/promotions')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('promotions/index'));

    $this->actingAs($user)->get('/audit-logs')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('audit-logs/index'));
});
