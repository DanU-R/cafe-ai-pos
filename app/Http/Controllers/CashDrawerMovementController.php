<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CashierShift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashDrawerMovementController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['cash_in', 'cash_out', 'safe_drop'])],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $shift = CashierShift::query()
            ->where('user_id', $request->user()?->id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->firstOrFail();

        $movement = $shift->cashDrawerMovements()->create([
            'user_id' => $request->user()?->id,
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'note' => $validated['note'] ?? null,
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'cash_drawer.movement_created',
            'auditable_type' => CashierShift::class,
            'auditable_id' => $shift->id,
            'new_values' => $movement->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return back()->with('success', 'Mutasi kas berhasil dicatat.');
    }
}
