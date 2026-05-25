<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->category = Category::query()->create(['name' => 'Stok Testing']);
});

it('restocks product and records stock before and after', function () {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Restock Latte Testing',
        'description' => null,
        'price' => 18000,
        'stock' => 4,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('products.stock.store', $product), [
            'qty' => 6,
            'note' => 'Restock pagi',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $movement = StockMovement::query()->firstOrFail();

    expect($product->refresh()->stock)->toBe(10)
        ->and($movement->product_id)->toBe($product->id)
        ->and($movement->user_id)->toBe($this->user->id)
        ->and($movement->type)->toBe('restock')
        ->and($movement->qty)->toBe(6)
        ->and($movement->stock_before)->toBe(4)
        ->and($movement->stock_after)->toBe(10)
        ->and($movement->note)->toBe('Restock pagi');
});

it('rejects zero or negative restock qty', function (int $qty) {
    $product = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Invalid Restock Testing',
        'description' => null,
        'price' => 18000,
        'stock' => 4,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('products.stock.store', $product), [
            'qty' => $qty,
        ])
        ->assertSessionHasErrors('qty');

    expect($product->refresh()->stock)->toBe(4)
        ->and(StockMovement::query()->count())->toBe(0);
})->with([0, -1]);

it('shows stock history only for each product', function () {
    $firstProduct = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Produk Riwayat Satu',
        'description' => null,
        'price' => 18000,
        'stock' => 4,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $secondProduct = Product::query()->create([
        'category_id' => $this->category->id,
        'name' => 'Produk Riwayat Dua',
        'description' => null,
        'price' => 18000,
        'stock' => 8,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $firstProduct->stockMovements()->create([
        'user_id' => $this->user->id,
        'type' => 'restock',
        'qty' => 2,
        'stock_before' => 2,
        'stock_after' => 4,
        'note' => 'Catatan produk satu',
    ]);

    $secondProduct->stockMovements()->create([
        'user_id' => $this->user->id,
        'type' => 'restock',
        'qty' => 3,
        'stock_before' => 5,
        'stock_after' => 8,
        'note' => 'Catatan produk dua',
    ]);

    $this->actingAs($this->user)
        ->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->where('products.0.name', 'Produk Riwayat Satu')
            ->where('products.0.stock_movements.0.note', 'Catatan produk satu')
            ->where('products.1.name', 'Produk Riwayat Dua')
            ->where('products.1.stock_movements.0.note', 'Catatan produk dua'),
        );
});
