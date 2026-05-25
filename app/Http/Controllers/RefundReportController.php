<?php

namespace App\Http\Controllers;

use App\Models\OrderRefund;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class RefundReportController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $filters = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $date = Carbon::parse($filters['date'] ?? today())->toDateString();
        $refunds = OrderRefund::query()
            ->with(['order:id,order_code', 'user:id,name', 'items:id,order_refund_id,product_name,qty,amount'])
            ->whereDate('created_at', $date)
            ->latest()
            ->get();

        return Inertia::render('reports/refunds', [
            'filters' => [
                'date' => $date,
            ],
            'summary' => [
                'amount' => number_format((float) $refunds->sum('amount'), 2, '.', ''),
                'refund_count' => $refunds->count(),
                'item_qty' => (int) $refunds->flatMap->items->sum('qty'),
            ],
            'refunds' => $refunds->map(fn (OrderRefund $refund): array => [
                'id' => $refund->id,
                'refund_code' => $refund->refund_code,
                'created_at' => $refund->created_at?->toISOString(),
                'order_code' => $refund->order?->order_code ?? '-',
                'cashier' => $refund->user?->name ?? '-',
                'amount' => $refund->amount,
                'method' => $refund->method,
                'reason' => $refund->reason,
                'items' => $refund->items->map(fn ($item): array => [
                    'product_name' => $item->product_name,
                    'qty' => $item->qty,
                    'amount' => $item->amount,
                ])->values(),
            ])->values(),
        ]);
    }
}
