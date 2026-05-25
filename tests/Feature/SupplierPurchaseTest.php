<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('allows admin to manage suppliers', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->post(route('suppliers.store'), [
            'name' => 'Supplier Kopi Testing',
            'phone' => '08123456789',
            'email' => 'supplier@example.test',
            'address' => 'Jl Testing',
            'is_active' => true,
        ])
        ->assertRedirect(route('suppliers.index'));

    $supplier = Supplier::query()->firstOrFail();

    $this->actingAs($admin)
        ->get(route('suppliers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('suppliers/index')
            ->has('suppliers', 1)
            ->where('suppliers.0.name', 'Supplier Kopi Testing')
            ->where('suppliers.0.is_active', true),
        );

    $this->actingAs($admin)
        ->put(route('suppliers.update', $supplier), [
            'name' => 'Supplier Kopi Updated',
            'phone' => null,
            'email' => null,
            'address' => null,
            'is_active' => false,
        ])
        ->assertRedirect(route('suppliers.index'));

    expect($supplier->refresh()->name)->toBe('Supplier Kopi Updated')
        ->and($supplier->is_active)->toBeFalse();
});

it('stores purchase, increases stock, updates cost, and records movement', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $supplier = Supplier::query()->create([
        'name' => 'Supplier Purchase Testing',
        'is_active' => true,
    ]);
    $category = Category::query()->create(['name' => 'Purchase Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Purchase Latte',
        'description' => null,
        'price' => 25000,
        'cost_price' => 10000,
        'stock' => 3,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->post(route('purchases.store'), [
            'supplier_id' => $supplier->id,
            'purchase_date' => now()->toDateString(),
            'note' => 'INV-001',
            'items' => [
                [
                    'product_id' => $product->id,
                    'qty' => 4,
                    'unit_cost' => 12000,
                ],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('purchases.index'));

    $purchase = Purchase::query()->with('items')->firstOrFail();
    $movement = StockMovement::query()->firstOrFail();

    expect($purchase->purchase_code)->toStartWith('PO-'.now()->format('Ymd').'-')
        ->and($purchase->supplier_id)->toBe($supplier->id)
        ->and($purchase->user_id)->toBe($admin->id)
        ->and($purchase->total_amount)->toBe('48000.00')
        ->and($purchase->items)->toHaveCount(1)
        ->and($purchase->items->first()->product_name)->toBe('Purchase Latte')
        ->and($product->refresh()->stock)->toBe(7)
        ->and($product->cost_price)->toBe('12000.00')
        ->and($movement->product_id)->toBe($product->id)
        ->and($movement->user_id)->toBe($admin->id)
        ->and($movement->type)->toBe('purchase')
        ->and($movement->qty)->toBe(4)
        ->and($movement->stock_before)->toBe(3)
        ->and($movement->stock_after)->toBe(7)
        ->and($movement->note)->toBe($purchase->purchase_code);
});

it('shows purchase pages to admin only', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $cashier = User::factory()->create(['role' => 'cashier']);

    $this->actingAs($admin)
        ->get(route('purchases.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('purchases/index'));

    $this->actingAs($cashier)
        ->get(route('purchases.index'))
        ->assertForbidden();
});
