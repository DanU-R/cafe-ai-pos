<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\RawMaterial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WastageController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('wastage/form', [
            'rawMaterials' => RawMaterial::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'unit', 'stock']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'raw_material_id' => ['required', 'integer', 'exists:raw_materials,id'],
            'qty' => ['required', 'numeric', 'min:0.001'],
            'note' => ['required', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $validated): void {
            $material = RawMaterial::query()
                ->whereKey($validated['raw_material_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $qty = (float) $validated['qty'];
            $stockBefore = (float) $material->stock;

            if ($qty > $stockBefore) {
                abort(422, 'Qty wastage tidak boleh melebihi stok bahan.');
            }

            $stockAfter = $stockBefore - $qty;
            $material->update(['stock' => $stockAfter]);
            $movement = $material->movements()->create([
                'user_id' => $request->user()?->id,
                'type' => 'wastage',
                'qty' => $qty,
                'stock_before' => $stockBefore,
                'stock_after' => $stockAfter,
                'note' => $validated['note'],
            ]);

            AuditLog::query()->create([
                'user_id' => $request->user()?->id,
                'event' => 'raw_material.wastage',
                'auditable_type' => RawMaterial::class,
                'auditable_id' => $material->id,
                'old_values' => ['stock' => $stockBefore],
                'new_values' => ['stock' => $stockAfter, 'movement_id' => $movement->id],
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]);
        });

        return to_route('raw-materials.index')->with('success', 'Wastage bahan berhasil dicatat.');
    }
}
