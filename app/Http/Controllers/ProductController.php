<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Display a listing of products.
     */
    public function index(): Response
    {
        return Inertia::render('products/index', [
            'products' => Product::query()
                ->with('category:id,name')
                ->latest()
                ->get(['id', 'category_id', 'name', 'description', 'price', 'is_active', 'created_at']),
        ]);
    }

    /**
     * Show the form for creating a new product.
     */
    public function create(): Response
    {
        return Inertia::render('products/form', [
            'categories' => $this->categoryOptions(),
            'generatedDescription' => session('generatedDescription'),
        ]);
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        Product::create($this->validated($request));

        return to_route('products.index');
    }

    /**
     * Show the form for editing the specified product.
     */
    public function edit(Product $product): Response
    {
        return Inertia::render('products/form', [
            'categories' => $this->categoryOptions(),
            'generatedDescription' => session('generatedDescription'),
            'product' => [
                'id' => $product->id,
                'category_id' => $product->category_id,
                'name' => $product->name,
                'description' => $product->description,
                'price' => $product->price,
                'is_active' => $product->is_active,
            ],
        ]);
    }

    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, Product $product): RedirectResponse
    {
        $product->update($this->validated($request));

        return to_route('products.index');
    }

    /**
     * Remove the specified product from storage.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return to_route('products.index');
    }

    /**
     * Validate product input.
     *
     * @return array{category_id: int, name: string, description: string|null, price: numeric-string, is_active: bool}
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    /**
     * Get category select options.
     *
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string}>
     */
    private function categoryOptions()
    {
        return Category::query()
            ->orderBy('name')
            ->get(['id', 'name']);
    }
}
