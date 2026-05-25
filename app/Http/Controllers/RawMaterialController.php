<?php

namespace App\Http\Controllers;

use App\Models\RawMaterial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RawMaterialController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('raw-materials/index', [
            'materials' => RawMaterial::query()
                ->with(['movements' => fn ($query) => $query->with('user:id,name')->latest()->limit(5)])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('raw-materials/form');
    }

    public function store(Request $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            $material = RawMaterial::query()->create($this->validated($request));

            if ((float) $material->stock > 0) {
                $material->movements()->create([
                    'user_id' => $request->user()?->id,
                    'type' => 'restock',
                    'qty' => $material->stock,
                    'stock_before' => 0,
                    'stock_after' => $material->stock,
                    'note' => 'Stok awal',
                ]);
            }
        });

        return to_route('raw-materials.index');
    }

    public function edit(RawMaterial $rawMaterial): Response
    {
        return Inertia::render('raw-materials/form', [
            'material' => $rawMaterial,
        ]);
    }

    public function update(Request $request, RawMaterial $rawMaterial): RedirectResponse
    {
        DB::transaction(function () use ($request, $rawMaterial): void {
            $validated = $this->validated($request);
            $stockBefore = (float) $rawMaterial->stock;
            $stockAfter = (float) $validated['stock'];

            $rawMaterial->update($validated);

            if ($stockBefore !== $stockAfter) {
                $rawMaterial->movements()->create([
                    'user_id' => $request->user()?->id,
                    'type' => $stockAfter > $stockBefore ? 'restock' : 'adjustment',
                    'qty' => abs($stockAfter - $stockBefore),
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'note' => 'Update bahan baku',
                ]);
            }
        });

        return to_route('raw-materials.index');
    }

    public function destroy(RawMaterial $rawMaterial): RedirectResponse
    {
        $rawMaterial->delete();

        return to_route('raw-materials.index');
    }

    /**
     * @return array{name: string, unit: string, stock: numeric-string, minimum_stock: numeric-string, cost_per_unit: numeric-string, is_active: bool}
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'unit' => ['required', 'string', 'max:20'],
            'stock' => ['required', 'numeric', 'min:0'],
            'minimum_stock' => ['required', 'numeric', 'min:0'],
            'cost_per_unit' => ['required', 'numeric', 'min:0'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
