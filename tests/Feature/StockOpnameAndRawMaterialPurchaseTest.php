<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\RawMaterialMovement;
use App\Models\RawMaterialPurchase;
use App\Models\StockMovement;
use App\Models\StockOpname;
use App\Models\Supplier;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('allows admin to open inventory control pages', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('stock-opnames.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('stock-opnames/index'));

    $this->actingAs($admin)
        ->get(route('stock-opnames.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('stock-opnames/form'));

    $this->actingAs($admin)
        ->get(route('raw-material-purchases.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('raw-material-purchases/index'));

    $this->actingAs($admin)
        ->get(route('raw-material-purchases.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('raw-material-purchases/form'));
});

it('blocks cashier from inventory control pages and actions', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);
    $opname = StockOpname::query()->create([
        'user_id' => $cashier->id,
        'opname_code' => 'SO-20260523-BLOCK',
        'opname_date' => now()->toDateString(),
        'status' => 'draft',
    ]);

    $this->actingAs($cashier)
        ->get(route('stock-opnames.index'))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->get(route('stock-opnames.create'))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->post(route('stock-opnames.store'), [])
        ->assertForbidden();

    $this->actingAs($cashier)
        ->post(route('stock-opnames.approve', $opname))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->get(route('raw-material-purchases.index'))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->get(route('raw-material-purchases.create'))
        ->assertForbidden();

    $this->actingAs($cashier)
        ->post(route('raw-material-purchases.store'), [])
        ->assertForbidden();
});

it('purchases raw materials and records restock movement', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $supplier = Supplier::query()->create(['name' => 'Supplier Bahan', 'is_active' => true]);
    $material = RawMaterial::query()->create([
        'name' => 'Susu Segar',
        'unit' => 'ml',
        'stock' => 100,
        'minimum_stock' => 20,
        'cost_per_unit' => 100,
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->post(route('raw-material-purchases.store'), [
            'supplier_id' => $supplier->id,
            'purchase_date' => now()->toDateString(),
            'items' => [
                ['raw_material_id' => $material->id, 'qty' => 50, 'unit_cost' => 120],
            ],
        ])
        ->assertRedirect(route('raw-material-purchases.index'));

    expect($material->refresh()->stock)->toBe('150.000')
        ->and($material->cost_per_unit)->toBe('120.00')
        ->and(RawMaterialPurchase::query()->count())->toBe(1)
        ->and(RawMaterialMovement::query()->where('type', 'purchase')->count())->toBe(1);
});

it('creates and approves stock opname adjustments for product and raw material', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $category = Category::query()->create(['name' => 'Opname Category']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Opname Latte',
        'price' => 20000,
        'cost_price' => 10000,
        'stock' => 10,
        'minimum_stock' => 2,
        'is_active' => true,
    ]);
    $material = RawMaterial::query()->create([
        'name' => 'Kopi Bubuk',
        'unit' => 'gram',
        'stock' => 200,
        'minimum_stock' => 50,
        'cost_per_unit' => 50,
        'is_active' => true,
    ]);

    $this->actingAs($admin)
        ->post(route('stock-opnames.store'), [
            'opname_date' => now()->toDateString(),
            'items' => [
                ['type' => 'product', 'id' => $product->id, 'counted_stock' => 8],
                ['type' => 'raw_material', 'id' => $material->id, 'counted_stock' => 180],
            ],
        ])
        ->assertRedirect(route('stock-opnames.index'));

    $opname = StockOpname::query()->with('items')->firstOrFail();

    expect($opname->status)->toBe('draft')
        ->and($opname->items)->toHaveCount(2);

    $this->actingAs($admin)
        ->post(route('stock-opnames.approve', $opname))
        ->assertRedirect(route('stock-opnames.index'));

    expect($opname->refresh()->status)->toBe('approved')
        ->and($product->refresh()->stock)->toBe(8)
        ->and($material->refresh()->stock)->toBe('180.000')
        ->and(StockMovement::query()->where('type', 'adjustment')->count())->toBe(1)
        ->and(RawMaterialMovement::query()->where('type', 'adjustment')->count())->toBe(1);
});
