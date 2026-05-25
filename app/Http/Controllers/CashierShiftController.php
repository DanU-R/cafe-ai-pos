<?php

namespace App\Http\Controllers;

use App\Models\CashierShift;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CashierShiftController extends Controller
{
    /**
     * Display cashier shifts.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('cashier-shifts/index', [
            'openShift' => $this->openShiftPayload($request),
            'shifts' => CashierShift::query()
                ->with(['orders.payments', 'user:id,name'])
                ->latest('opened_at')
                ->get()
                ->map(fn (CashierShift $shift): array => [
                    'id' => $shift->id,
                    'shift_code' => $shift->shift_code,
                    'cashier' => $shift->user?->name,
                    'opened_at' => $shift->opened_at?->toDateTimeString(),
                    'closed_at' => $shift->closed_at?->toDateTimeString(),
                    'opening_cash' => $shift->opening_cash,
                    'expected_cash' => $shift->expected_cash,
                    'actual_cash' => $shift->actual_cash,
                    'expected_bca' => $shift->expected_bca,
                    'actual_bca' => $shift->actual_bca,
                    'expected_qris' => $shift->expected_qris,
                    'actual_qris' => $shift->actual_qris,
                    'cash_difference' => $shift->cash_difference,
                    'status' => $shift->status,
                    'note' => $shift->note,
                ]),
        ]);
    }

    /**
     * Open a cashier shift.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'opening_cash' => ['required', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $hasOpenShift = CashierShift::query()
            ->where('user_id', $request->user()?->id)
            ->where('status', 'open')
            ->exists();

        if ($hasOpenShift) {
            throw ValidationException::withMessages([
                'opening_cash' => 'Shift kasir masih terbuka.',
            ]);
        }

        CashierShift::create([
            'user_id' => $request->user()?->id,
            'shift_code' => $this->nextShiftCode(),
            'opened_at' => now(),
            'opening_cash' => $validated['opening_cash'],
            'expected_cash' => $validated['opening_cash'],
            'expected_bca' => 0,
            'expected_qris' => 0,
            'note' => $validated['note'] ?? null,
            'status' => 'open',
        ]);

        return to_route('cashier-shifts.index');
    }

    /**
     * Close a cashier shift.
     */
    public function update(Request $request, CashierShift $cashierShift): RedirectResponse
    {
        if ($cashierShift->status !== 'open') {
            throw ValidationException::withMessages([
                'actual_cash' => 'Shift kasir sudah ditutup.',
            ]);
        }

        $validated = $request->validate([
            'actual_cash' => ['required', 'numeric', 'min:0'],
            'actual_bca' => ['required', 'numeric', 'min:0'],
            'actual_qris' => ['required', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $expected = $this->expectedAmounts($cashierShift);
        $actualCash = (float) $validated['actual_cash'];
        $actualBca = (float) $validated['actual_bca'];
        $actualQris = (float) $validated['actual_qris'];

        $cashierShift->update([
            'closed_at' => now(),
            'expected_cash' => $expected['cash'],
            'actual_cash' => $actualCash,
            'expected_bca' => $expected['bca'],
            'actual_bca' => $actualBca,
            'expected_qris' => $expected['qris'],
            'actual_qris' => $actualQris,
            'cash_difference' => ($actualCash - $expected['cash']) + ($actualBca - $expected['bca']) + ($actualQris - $expected['qris']),
            'note' => $validated['note'] ?? $cashierShift->note,
            'status' => 'closed',
        ]);

        return to_route('cashier-shifts.index');
    }

    /**
     * Find active cashier shift for current user.
     *
     * @return array<string, mixed>|null
     */
    private function openShiftPayload(Request $request): ?array
    {
        $shift = CashierShift::query()
            ->where('user_id', $request->user()?->id)
            ->where('status', 'open')
            ->latest('opened_at')
            ->first();

        if (! $shift) {
            return null;
        }

        $expected = $this->expectedAmounts($shift);

        return [
            'id' => $shift->id,
            'shift_code' => $shift->shift_code,
            'opened_at' => $shift->opened_at?->toDateTimeString(),
            'opening_cash' => $shift->opening_cash,
            'expected_cash' => $expected['cash'],
            'expected_bca' => $expected['bca'],
            'expected_qris' => $expected['qris'],
            'cash_sales' => $expected['cash_sales'],
            'bca_sales' => $expected['bca_sales'],
            'qris_sales' => $expected['qris_sales'],
            'cash_movements' => $expected['cash_movements'],
            'note' => $shift->note,
        ];
    }

    /**
     * @return array{cash: float, bca: float, qris: float, cash_sales: float, bca_sales: float, qris_sales: float, cash_movements: float}
     */
    private function expectedAmounts(CashierShift $shift): array
    {
        $payments = $shift->orders()
            ->where('status', 'completed')
            ->with('payments')
            ->get()
            ->flatMap(fn ($order): Collection => $order->payments);

        $cashSales = (float) $payments->where('method', 'cash')->sum('amount');
        $bcaSales = (float) $payments->where('method', 'card')->sum('amount');
        $qrisSales = (float) $payments->where('method', 'qris')->sum('amount');
        $cashMovements = (float) $shift->cashDrawerMovements()
            ->get()
            ->sum(fn ($movement): float => match ($movement->type) {
                'cash_in' => (float) $movement->amount,
                'cash_out', 'safe_drop' => -1 * (float) $movement->amount,
                default => 0.0,
            });

        return [
            'cash' => (float) $shift->opening_cash + $cashSales + $cashMovements,
            'bca' => $bcaSales,
            'qris' => $qrisSales,
            'cash_sales' => $cashSales,
            'bca_sales' => $bcaSales,
            'qris_sales' => $qrisSales,
            'cash_movements' => $cashMovements,
        ];
    }

    /**
     * Generate shift code.
     */
    private function nextShiftCode(): string
    {
        return DB::transaction(function (): string {
            $prefix = 'SHIFT-'.now()->format('Ymd').'-';
            $latestCode = CashierShift::query()
                ->where('shift_code', 'like', $prefix.'%')
                ->lockForUpdate()
                ->latest('id')
                ->value('shift_code');

            $nextNumber = $latestCode ? ((int) substr($latestCode, -4)) + 1 : 1;

            return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
        });
    }
}
