<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseController extends Controller
{
    /**
     * Display purchases.
     */
    public function index(): Response
    {
        return Inertia::render('purchases/index', [
            'purchases' => Purchase::query()
                ->with(['supplier:id,name', 'user:id,name'])
                ->withCount('items')
                ->latest('purchase_date')
                ->latest('id')
                ->get()
                ->map(fn (Purchase $purchase): array => [
                    'id' => $purchase->id,
                    'purchase_code' => $purchase->purchase_code,
                    'supplier' => $purchase->supplier?->name,
                    'cashier' => $purchase->user?->name,
                    'purchase_date' => $purchase->purchase_date?->toDateString(),
                    'total_amount' => $purchase->total_amount,
                    'items_count' => $purchase->items_count,
                    'status' => $purchase->status,
                    'note' => $purchase->note,
                ]),
        ]);
    }

    /**
     * Show create purchase form.
     */
    public function create(): Response
    {
        return Inertia::render('purchases/form', [
            'suppliers' => Supplier::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']),
            'products' => Product::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'stock', 'cost_price']),
        ]);
    }

    /**
     * Store purchase and increase product stock.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'purchase_date' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            $items = collect($validated['items']);
            $products = Product::query()
                ->whereIn('id', $items->pluck('product_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $purchaseItems = $items->map(function (array $item) use ($products): array {
                $product = $products->get($item['product_id']);

                if (! $product || ! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => 'Produk tidak tersedia atau sudah tidak aktif.',
                    ]);
                }

                $qty = (int) $item['qty'];
                $unitCost = (float) $item['unit_cost'];
                $stockBefore = $product->stock;

                return [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'qty' => $qty,
                    'unit_cost' => $unitCost,
                    'subtotal' => $qty * $unitCost,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockBefore + $qty,
                ];
            });

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'] ?? null,
                'user_id' => $request->user()?->id,
                'purchase_code' => $this->nextPurchaseCode(),
                'purchase_date' => $validated['purchase_date'],
                'total_amount' => $purchaseItems->sum('subtotal'),
                'note' => $validated['note'] ?? null,
                'status' => 'completed',
            ]);

            foreach ($purchaseItems as $item) {
                $purchase->items()->create([
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'qty' => $item['qty'],
                    'unit_cost' => $item['unit_cost'],
                    'subtotal' => $item['subtotal'],
                ]);

                Product::query()
                    ->whereKey($item['product_id'])
                    ->update([
                        'stock' => $item['stock_after'],
                        'cost_price' => $item['unit_cost'],
                    ]);

                Product::query()
                    ->findOrFail($item['product_id'])
                    ->stockMovements()
                    ->create([
                        'user_id' => $request->user()?->id,
                        'type' => 'purchase',
                        'qty' => $item['qty'],
                        'stock_before' => $item['stock_before'],
                        'stock_after' => $item['stock_after'],
                        'note' => $purchase->purchase_code,
                    ]);
            }
        });

        return to_route('purchases.index');
    }

    /**
     * Generate purchase code.
     */
    private function nextPurchaseCode(): string
    {
        $prefix = 'PO-'.now()->format('Ymd').'-';
        $latestCode = Purchase::query()
            ->where('purchase_code', 'like', $prefix.'%')
            ->lockForUpdate()
            ->latest('id')
            ->value('purchase_code');

        $nextNumber = $latestCode ? ((int) substr($latestCode, -4)) + 1 : 1;

        return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }
}
