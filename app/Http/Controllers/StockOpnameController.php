<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\StockOpname;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StockOpnameController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('stock-opnames/index', [
            'opnames' => StockOpname::query()
                ->with(['user:id,name', 'approver:id,name'])
                ->withCount('items')
                ->latest('opname_date')
                ->latest('id')
                ->get()
                ->map(fn (StockOpname $opname): array => [
                    'id' => $opname->id,
                    'opname_code' => $opname->opname_code,
                    'opname_date' => $opname->opname_date?->toDateString(),
                    'status' => $opname->status,
                    'user' => $opname->user?->name,
                    'approver' => $opname->approver?->name,
                    'approved_at' => $opname->approved_at?->toDateTimeString(),
                    'items_count' => $opname->items_count,
                    'note' => $opname->note,
                ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('stock-opnames/form', [
            'products' => Product::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'stock']),
            'rawMaterials' => RawMaterial::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'stock']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'opname_date' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.type' => ['required', 'string', Rule::in(['product', 'raw_material'])],
            'items.*.id' => ['required', 'integer'],
            'items.*.counted_stock' => ['required', 'numeric', 'min:0'],
            'items.*.note' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            $items = collect($validated['items']);
            $products = Product::query()->whereIn('id', $items->where('type', 'product')->pluck('id')->sort()->values())->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $materials = RawMaterial::query()->whereIn('id', $items->where('type', 'raw_material')->pluck('id')->sort()->values())->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            $opname = StockOpname::create([
                'user_id' => $request->user()?->id,
                'opname_code' => $this->nextOpnameCode(),
                'opname_date' => $validated['opname_date'],
                'status' => 'draft',
                'note' => $validated['note'] ?? null,
            ]);

            foreach ($items as $item) {
                $stockable = $item['type'] === 'product'
                    ? $products->get($item['id'])
                    : $materials->get($item['id']);

                if (! $stockable || ! $stockable->is_active) {
                    throw ValidationException::withMessages(['items' => 'Item stok tidak tersedia atau sudah tidak aktif.']);
                }

                $systemStock = (float) $stockable->stock;
                $countedStock = (float) $item['counted_stock'];

                $opname->items()->create([
                    'stockable_type' => $stockable::class,
                    'stockable_id' => $stockable->id,
                    'stockable_name' => $stockable->name,
                    'unit' => $stockable instanceof RawMaterial ? $stockable->unit : 'pcs',
                    'system_stock' => $systemStock,
                    'counted_stock' => $countedStock,
                    'difference' => $countedStock - $systemStock,
                    'note' => $item['note'] ?? null,
                ]);
            }
        });

        return to_route('stock-opnames.index');
    }

    public function approve(Request $request, StockOpname $stockOpname): RedirectResponse
    {
        DB::transaction(function () use ($request, $stockOpname): void {
            $stockOpname = StockOpname::query()->with('items')->whereKey($stockOpname->id)->lockForUpdate()->firstOrFail();

            if ($stockOpname->status !== 'draft') {
                throw ValidationException::withMessages(['status' => 'Stock opname sudah diproses.']);
            }

            foreach ($stockOpname->items->sortBy([['stockable_type', 'asc'], ['stockable_id', 'asc']]) as $item) {
                $stockable = $item->stockable_type::query()->whereKey($item->stockable_id)->lockForUpdate()->first();

                if (! $stockable) {
                    continue;
                }

                $stockBefore = (float) $stockable->stock;
                $stockAfter = (float) $item->counted_stock;
                $qty = abs($stockAfter - $stockBefore);

                $stockable->update(['stock' => $stockAfter]);

                if ($stockable instanceof Product) {
                    $stockable->stockMovements()->create([
                        'user_id' => $request->user()?->id,
                        'type' => 'adjustment',
                        'qty' => $qty,
                        'stock_before' => $stockBefore,
                        'stock_after' => $stockAfter,
                        'note' => $stockOpname->opname_code,
                    ]);
                }

                if ($stockable instanceof RawMaterial) {
                    $stockable->movements()->create([
                        'user_id' => $request->user()?->id,
                        'type' => 'adjustment',
                        'qty' => $qty,
                        'stock_before' => $stockBefore,
                        'stock_after' => $stockAfter,
                        'note' => $stockOpname->opname_code,
                    ]);
                }
            }

            $stockOpname->update([
                'status' => 'approved',
                'approved_by' => $request->user()?->id,
                'approved_at' => now(),
            ]);
        });

        return to_route('stock-opnames.index');
    }

    private function nextOpnameCode(): string
    {
        $prefix = 'SO-'.now()->format('Ymd').'-';
        $latestCode = StockOpname::query()->where('opname_code', 'like', $prefix.'%')->lockForUpdate()->latest('id')->value('opname_code');
        $nextNumber = $latestCode ? ((int) substr($latestCode, -4)) + 1 : 1;

        return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }
}
