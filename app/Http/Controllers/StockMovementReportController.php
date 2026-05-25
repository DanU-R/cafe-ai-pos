<?php

namespace App\Http\Controllers;

use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StockMovementReportController extends Controller
{
    public function index(Request $request): Response
    {
        $data = $this->reportData($request);

        return Inertia::render('reports/stock-movements', $data);
    }

    public function export(Request $request): StreamedResponse
    {
        $data = $this->reportData($request);
        $filename = 'stock-movements-'.$data['filters']['date'].'.csv';

        return response()->streamDownload(function () use ($data): void {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['Tanggal', 'Produk', 'Type', 'Qty', 'Sebelum', 'Sesudah', 'User', 'Catatan']);

            foreach ($data['movements'] as $movement) {
                fputcsv($output, [
                    $movement['created_at'],
                    $movement['product_name'],
                    $movement['type'],
                    $movement['qty'],
                    $movement['stock_before'],
                    $movement['stock_after'],
                    $movement['user'],
                    $movement['note'],
                ]);
            }

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * @return array{filters: array{date: string, type: string}, summary: array{restock_qty: int, sale_qty: int, cancel_qty: int, movement_count: int}, movements: array<int, array<string, mixed>>}
     */
    private function reportData(Request $request): array
    {
        $filters = $request->validate([
            'date' => ['nullable', 'date'],
            'type' => ['nullable', 'string', 'in:all,restock,sale,cancel'],
        ]);

        $date = Carbon::parse($filters['date'] ?? today())->toDateString();
        $type = ($filters['type'] ?? '') === 'all' ? '' : ($filters['type'] ?? '');

        $movements = StockMovement::query()
            ->with(['product:id,name', 'user:id,name'])
            ->whereDate('created_at', $date)
            ->when($type !== '', fn ($query) => $query->where('type', $type))
            ->latest()
            ->get();

        return [
            'filters' => [
                'date' => $date,
                'type' => $type,
            ],
            'summary' => [
                'restock_qty' => (int) $movements->where('type', 'restock')->sum('qty'),
                'sale_qty' => (int) $movements->where('type', 'sale')->sum('qty'),
                'cancel_qty' => (int) $movements->where('type', 'cancel')->sum('qty'),
                'movement_count' => $movements->count(),
            ],
            'movements' => $movements->map(fn (StockMovement $movement): array => [
                'id' => $movement->id,
                'created_at' => $movement->created_at?->toISOString(),
                'product_name' => $movement->product?->name ?? '-',
                'type' => $movement->type,
                'qty' => $movement->qty,
                'stock_before' => $movement->stock_before,
                'stock_after' => $movement->stock_after,
                'user' => $movement->user?->name ?? '-',
                'note' => $movement->note,
            ])->values()->all(),
        ];
    }
}
