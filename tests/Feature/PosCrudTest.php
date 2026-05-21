<?php

use App\Models\Category;
use App\Models\Product;
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
        'is_active' => true,
    ]);

    $this->actingAs($this->user)
        ->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->has('products')
            ->where('products.0.name', 'Nasi Goreng Testing')
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
            'is_active' => false,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'name' => 'Kentang Goreng Testing Update',
        'description' => 'Kentang goreng QA sudah diubah.',
        'is_active' => false,
    ]);

    $this->actingAs($this->user)
        ->delete(route('products.destroy', $product))
        ->assertRedirect(route('products.index'));

    $this->assertDatabaseMissing('products', [
        'id' => $product->id,
    ]);
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
