<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('products/index', [
            'products' => Product::query()
                ->with([
                    'category:id,name',
                    'stockMovements' => fn ($query) => $query
                        ->with('user:id,name')
                        ->latest(),
                ])
                ->latest()
                ->get(['id', 'category_id', 'name', 'description', 'price', 'cost_price', 'stock', 'minimum_stock', 'is_active', 'created_at']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('products/form', [
            'categories' => $this->categoryOptions(),
            'rawMaterials' => $this->rawMaterialOptions(),
            'generatedDescription' => session('generatedDescription'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $validated = $this->validated($request);
            $recipes = $validated['recipes'] ?? [];
            $modifiers = $validated['modifiers'] ?? [];
            unset($validated['recipes'], $validated['modifiers']);

            $product = Product::query()->create($validated);
            $this->syncRecipes($product, $recipes);
            $this->syncModifiers($product, $modifiers);
        });

        return to_route('products.index');
    }

    public function edit(Product $product): Response
    {
        $product->load('recipes.rawMaterial:id,name,unit', 'modifiers');

        return Inertia::render('products/form', [
            'categories' => $this->categoryOptions(),
            'rawMaterials' => $this->rawMaterialOptions(),
            'generatedDescription' => session('generatedDescription'),
            'product' => [
                'id' => $product->id,
                'category_id' => $product->category_id,
                'name' => $product->name,
                'description' => $product->description,
                'price' => $product->price,
                'cost_price' => $product->cost_price,
                'stock' => $product->stock,
                'minimum_stock' => $product->minimum_stock,
                'is_active' => $product->is_active,
                'recipes' => $product->recipes->map(fn ($recipe): array => [
                    'raw_material_id' => $recipe->raw_material_id,
                    'qty' => $recipe->qty,
                ])->values(),
                'modifiers' => $product->modifiers->map(fn ($modifier): array => [
                    'id' => $modifier->id,
                    'name' => $modifier->name,
                    'price' => $modifier->price,
                    'is_active' => $modifier->is_active,
                ])->values(),
            ],
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        DB::transaction(function () use ($request, $product): void {
            $validated = $this->validated($request);
            $recipes = $validated['recipes'] ?? [];
            $modifiers = $validated['modifiers'] ?? [];
            unset($validated['recipes'], $validated['modifiers']);

            $product->update($validated);
            $this->syncRecipes($product, $recipes);
            $this->syncModifiers($product, $modifiers);
        });

        return to_route('products.index');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return to_route('products.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'minimum_stock' => ['required', 'integer', 'min:0'],
            'is_active' => ['required', 'boolean'],
            'recipes' => ['nullable', 'array'],
            'recipes.*.raw_material_id' => ['required_with:recipes', 'integer', 'distinct', Rule::exists('raw_materials', 'id')],
            'recipes.*.qty' => ['required_with:recipes', 'numeric', 'min:0.001'],
            'modifiers' => ['nullable', 'array'],
            'modifiers.*.name' => ['required_with:modifiers', 'string', 'max:255'],
            'modifiers.*.price' => ['required_with:modifiers', 'numeric', 'min:0'],
            'modifiers.*.is_active' => ['required_with:modifiers', 'boolean'],
        ]);
    }

    /**
     * @return Collection<int, array{id: int, name: string}>
     */
    private function categoryOptions(): Collection
    {
        return Category::query()
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    /**
     * @return Collection<int, array{id: int, name: string, unit: string, stock: string}>
     */
    private function rawMaterialOptions(): Collection
    {
        return RawMaterial::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'unit', 'stock']);
    }

    /**
     * @param  array<int, array{raw_material_id: int, qty: numeric-string}>  $recipes
     */
    private function syncRecipes(Product $product, array $recipes): void
    {
        $product->recipes()->delete();

        foreach ($recipes as $recipe) {
            $product->recipes()->create([
                'raw_material_id' => $recipe['raw_material_id'],
                'qty' => $recipe['qty'],
            ]);
        }
    }

    /**
     * @param  array<int, array{name: string, price: numeric-string, is_active: bool}>  $modifiers
     */
    private function syncModifiers(Product $product, array $modifiers): void
    {
        $product->modifiers()->delete();

        foreach ($modifiers as $modifier) {
            $product->modifiers()->create([
                'name' => $modifier['name'],
                'price' => $modifier['price'],
                'is_active' => $modifier['is_active'],
            ]);
        }
    }
}
