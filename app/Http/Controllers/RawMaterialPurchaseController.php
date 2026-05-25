<?php

namespace App\Http\Controllers;

use App\Models\RawMaterial;
use App\Models\RawMaterialPurchase;
use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RawMaterialPurchaseController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('raw-material-purchases/index', [
            'purchases' => RawMaterialPurchase::query()
                ->with(['supplier:id,name', 'user:id,name'])
                ->withCount('items')
                ->latest('purchase_date')
                ->latest('id')
                ->get()
                ->map(fn (RawMaterialPurchase $purchase): array => [
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

    public function create(): Response
    {
        return Inertia::render('raw-material-purchases/form', [
            'suppliers' => Supplier::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'rawMaterials' => RawMaterial::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit', 'stock', 'cost_per_unit']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'purchase_date' => ['required', 'date'],
            'note' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.raw_material_id' => ['required', 'integer', 'distinct', 'exists:raw_materials,id'],
            'items.*.qty' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            $items = collect($validated['items']);
            $materials = RawMaterial::query()->whereIn('id', $items->pluck('raw_material_id'))->lockForUpdate()->get()->keyBy('id');

            $purchaseItems = $items->map(function (array $item) use ($materials): array {
                $material = $materials->get($item['raw_material_id']);

                if (! $material || ! $material->is_active) {
                    throw ValidationException::withMessages(['items' => 'Bahan baku tidak tersedia atau sudah tidak aktif.']);
                }

                $qty = (float) $item['qty'];
                $unitCost = (float) $item['unit_cost'];
                $stockBefore = (float) $material->stock;

                return [
                    'raw_material_id' => $material->id,
                    'raw_material_name' => $material->name,
                    'unit' => $material->unit,
                    'qty' => $qty,
                    'unit_cost' => $unitCost,
                    'subtotal' => $qty * $unitCost,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockBefore + $qty,
                ];
            });

            $purchase = RawMaterialPurchase::create([
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
                    'raw_material_id' => $item['raw_material_id'],
                    'raw_material_name' => $item['raw_material_name'],
                    'unit' => $item['unit'],
                    'qty' => $item['qty'],
                    'unit_cost' => $item['unit_cost'],
                    'subtotal' => $item['subtotal'],
                ]);

                $material = $materials->get($item['raw_material_id']);
                $material->update([
                    'stock' => $item['stock_after'],
                    'cost_per_unit' => $item['unit_cost'],
                ]);
                $material->movements()->create([
                    'user_id' => $request->user()?->id,
                    'type' => 'purchase',
                    'qty' => $item['qty'],
                    'stock_before' => $item['stock_before'],
                    'stock_after' => $item['stock_after'],
                    'note' => $purchase->purchase_code,
                ]);
            }
        });

        return to_route('raw-material-purchases.index');
    }

    private function nextPurchaseCode(): string
    {
        $prefix = 'RMP-'.now()->format('Ymd').'-';
        $latestCode = RawMaterialPurchase::query()->where('purchase_code', 'like', $prefix.'%')->lockForUpdate()->latest('id')->value('purchase_code');
        $nextNumber = $latestCode ? ((int) substr($latestCode, -4)) + 1 : 1;

        return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }
}
