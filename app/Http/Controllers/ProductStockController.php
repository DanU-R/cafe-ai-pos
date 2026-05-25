<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProductStockController extends Controller
{
    /**
     * Restock the specified product and record stock movement.
     */
    public function store(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate([
            'qty' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:1000'],
            'type' => ['nullable', Rule::in(['restock'])],
        ]);

        DB::transaction(function () use ($request, $product, $validated): void {
            $lockedProduct = Product::query()
                ->whereKey($product->id)
                ->lockForUpdate()
                ->firstOrFail();

            $qty = (int) $validated['qty'];
            $stockBefore = $lockedProduct->stock;
            $stockAfter = $stockBefore + $qty;

            $lockedProduct->update([
                'stock' => $stockAfter,
            ]);

            $lockedProduct->stockMovements()->create([
                'user_id' => $request->user()?->id,
                'type' => 'restock',
                'qty' => $qty,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'note' => $validated['note'] ?? null,
            ]);
        });

        return to_route('products.index')->with('success', 'Stok produk berhasil ditambah.');
    }
}
