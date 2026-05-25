<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('allows an authenticated user to view categories', function () {
    Category::query()->create(['name' => 'Minuman Testing']);

    $this->actingAs($this->user)
        ->get(route('categories.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/index')
            ->has('categories')
            ->where('categories.0.name', 'Minuman Testing'),
        );
});

it('allows an authenticated user to create update and delete a category without products', function () {
    $this->actingAs($this->user)
        ->post(route('categories.store'), [
            'name' => 'Minuman Testing',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('categories.index'));

    $category = Category::query()->where('name', 'Minuman Testing')->firstOrFail();

    $this->actingAs($this->user)
        ->put(route('categories.update', $category), [
            'name' => 'Minuman Testing Update',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('categories.index'));

    $this->assertDatabaseHas('categories', [
        'id' => $category->id,
        'name' => 'Minuman Testing Update',
    ]);

    $this->actingAs($this->user)
        ->delete(route('categories.destroy', $category))
        ->assertRedirect(route('categories.index'));

    $this->assertDatabaseMissing('categories', [
        'id' => $category->id,
    ]);
});

it('allows an authenticated user to view products', function () {
    $category = Category::query()->create(['name' => 'Makanan Testing']);

    Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Nasi Goreng Testing',
        'description' => 'Nasi goreng untuk QA.',
        'price' => 25000,
        'cost_price' => 15000,
        'stock' => 4,
        'minimum_stock' => 2,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->has('products')
            ->where('products.0.name', 'Nasi Goreng Testing')
            ->where('products.0.stock', 4)
            ->where('products.0.minimum_stock', 2)
            ->where('products.0.category.name', 'Makanan Testing'),
        );
});

it('allows an authenticated user to create update and delete a product', function () {
    $category = Category::query()->create(['name' => 'Snack Testing']);

    $this->actingAs($this->user)
        ->post(route('products.store'), [
            'category_id' => $category->id,
            'name' => 'Kentang Goreng Testing',
            'description' => 'Kentang goreng renyah untuk QA.',
            'price' => 18000,
            'cost_price' => 10000,
            'stock' => 10,
            'minimum_stock' => 3,
            'is_active' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::query()->where('name', 'Kentang Goreng Testing')->firstOrFail();

    $this->actingAs($this->user)
        ->put(route('products.update', $product), [
            'category_id' => $category->id,
            'name' => 'Kentang Goreng Testing Update',
            'description' => 'Kentang goreng QA sudah diubah.',
            'price' => 19000,
            'cost_price' => 11000,
            'stock' => 2,
            'minimum_stock' => 2,
            'is_active' => false,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'name' => 'Kentang Goreng Testing Update',
        'description' => 'Kentang goreng QA sudah diubah.',
        'cost_price' => '11000.00',
        'stock' => 2,
        'minimum_stock' => 2,
        'is_active' => false,
    ]);

    $this->actingAs($this->user)
        ->delete(route('products.destroy', $product))
        ->assertRedirect(route('products.index'));

    $this->assertDatabaseMissing('products', [
        'id' => $product->id,
    ]);
});

it('allows an authenticated user to restock product and records stock movement', function () {
    $category = Category::query()->create(['name' => 'Minuman Testing']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Kopi Restock Testing',
        'description' => null,
        'price' => 18000,
        'cost_price' => 10000,
        'stock' => 4,
        'minimum_stock' => 2,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('products.stock.store', $product), [
            'qty' => 6,
            'note' => 'Tambah stok pagi',
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
        ->and($movement->note)->toBe('Tambah stok pagi');
});

it('rejects invalid restock quantity and does not record stock movement', function () {
    $category = Category::query()->create(['name' => 'Minuman Testing']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Kopi Restock Invalid Testing',
        'description' => null,
        'price' => 18000,
        'cost_price' => 10000,
        'stock' => 4,
        'minimum_stock' => 2,
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->post(route('products.stock.store', $product), [
            'qty' => 0,
            'note' => 'Tidak boleh',
        ])
        ->assertSessionHasErrors('qty');

    expect($product->refresh()->stock)->toBe(4)
        ->and(StockMovement::query()->count())->toBe(0);
});

it('shows latest stock movements on products page', function () {
    $category = Category::query()->create(['name' => 'Minuman Testing']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Kopi Movement Testing',
        'description' => null,
        'price' => 18000,
        'cost_price' => 10000,
        'stock' => 7,
        'minimum_stock' => 2,
        'is_active' => true,
    ]);

    $product->stockMovements()->create([
        'user_id' => $this->user->id,
        'type' => 'restock',
        'qty' => 5,
        'stock_before' => 2,
        'stock_after' => 7,
        'note' => 'Restock siang',
    ]);

    $this->actingAs($this->user)
        ->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->where('products.0.name', 'Kopi Movement Testing')
            ->has('products.0.stock_movements', 1)
            ->where('products.0.stock_movements.0.type', 'restock')
            ->where('products.0.stock_movements.0.qty', 5)
            ->where('products.0.stock_movements.0.stock_before', 2)
            ->where('products.0.stock_movements.0.stock_after', 7)
            ->where('products.0.stock_movements.0.note', 'Restock siang'),
        );
});

it('shares the last generated ai description with the product form', function () {
    Category::query()->create(['name' => 'Minuman Testing']);

    $description = 'Es kopi susu gula aren yang creamy dan cocok untuk anak muda.';

    $this->actingAs($this->user)
        ->withSession(['generatedDescription' => $description])
        ->get(route('products.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/form')
            ->where('generatedDescription', $description)
            ->has('categories'),
        );
});

it('protects pos routes for guests', function (string $routeName) {
    $this->get(route($routeName))->assertRedirect(route('login'));
})->with([
    'dashboard',
    'menu-description.edit',
    'categories.index',
    'products.index',
]);
