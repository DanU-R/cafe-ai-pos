<?php

use App\Models\CashierShift;
use App\Models\Category;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('allows only super admin to set manager pin from user management', function (): void {
    $superAdmin = User::factory()->create(['role' => 'super_admin']);
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($superAdmin)
        ->post(route('users.store'), [
            'name' => 'Manager Pin User',
            'email' => 'manager-pin@example.test',
            'role' => 'admin',
            'password' => 'password-baru',
            'manager_pin' => '123456',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    $managedUser = User::query()->where('email', 'manager-pin@example.test')->firstOrFail();

    expect(Hash::check('123456', $managedUser->manager_pin_hash))->toBeTrue();

    $this->actingAs($admin)
        ->put(route('users.update', $managedUser), [
            'name' => 'Manager Pin User',
            'email' => 'manager-pin@example.test',
            'role' => 'admin',
            'password' => '',
            'manager_pin' => '654321',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    $managedUser->refresh();

    expect(Hash::check('123456', $managedUser->manager_pin_hash))->toBeTrue()
        ->and(Hash::check('654321', $managedUser->manager_pin_hash))->toBeFalse();
});

it('closes shift with expected cash bca and qris reconciliation', function (): void {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $shift = CashierShift::query()->create([
        'user_id' => $cashier->id,
        'shift_code' => 'SHIFT-PHASE2',
        'opened_at' => now(),
        'opening_cash' => 100000,
        'expected_cash' => 100000,
        'status' => 'open',
    ]);

    $category = Category::query()->create(['name' => 'Phase 2']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Phase 2 Latte',
        'price' => 20000,
        'stock' => 20,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($cashier)->post(route('pos.checkout'), [
        'payments' => [
            ['method' => 'cash', 'amount' => 20000],
            ['method' => 'card', 'amount' => 15000],
            ['method' => 'qris', 'amount' => 5000],
        ],
        'items' => [[
            'product_id' => $product->id,
            'qty' => 2,
        ]],
    ])->assertRedirect(route('pos.index'));

    $this->actingAs($cashier)->post(route('cash-drawer-movements.store'), [
        'type' => 'cash_in',
        'amount' => 10000,
    ])->assertRedirect();

    $this->actingAs($cashier)->patch(route('cashier-shifts.update', $shift), [
        'actual_cash' => 130000,
        'actual_bca' => 14000,
        'actual_qris' => 6000,
    ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('cashier-shifts.index'));

    $shift->refresh();

    expect($shift->expected_cash)->toBe('130000.00')
        ->and($shift->expected_bca)->toBe('15000.00')
        ->and($shift->expected_qris)->toBe('5000.00')
        ->and($shift->actual_cash)->toBe('130000.00')
        ->and($shift->actual_bca)->toBe('14000.00')
        ->and($shift->actual_qris)->toBe('6000.00')
        ->and($shift->cash_difference)->toBe('0.00')
        ->and($shift->status)->toBe('closed');
});

it('keeps modifier ids in checkout payload and item pricing', function (): void {
    $cashier = User::factory()->create(['role' => 'cashier']);
    CashierShift::query()->create([
        'user_id' => $cashier->id,
        'shift_code' => 'SHIFT-MOD-PHASE2',
        'opened_at' => now(),
        'opening_cash' => 0,
        'expected_cash' => 0,
        'status' => 'open',
    ]);

    $category = Category::query()->create(['name' => 'Modifier Phase 2']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Tea',
        'price' => 10000,
        'stock' => 10,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $modifier = $product->modifiers()->create([
        'name' => 'Boba',
        'price' => 3000,
        'is_active' => true,
    ]);

    $this->actingAs($cashier)->post(route('pos.checkout'), [
        'paid_amount' => 13000,
        'items' => [[
            'product_id' => $product->id,
            'qty' => 1,
            'modifier_ids' => [$modifier->id],
        ]],
    ])->assertRedirect(route('pos.index'));

    $orderItem = OrderItem::query()->with('modifiers')->firstOrFail();

    expect($orderItem->price)->toBe('13000.00')
        ->and($orderItem->modifiers)->toHaveCount(1)
        ->and($orderItem->modifiers->first()->name)->toBe('Boba');
});
