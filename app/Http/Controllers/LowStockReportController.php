<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LowStockReportController extends Controller
{
    /**
     * Display low stock report.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('reports/low-stock', $this->reportData($request));
    }

    /**
     * Export low stock report as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $data = $this->reportData($request);

        return response()->streamDownload(function () use ($data): void {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['Produk', 'Kategori', 'Stok', 'Minimum Stok', 'Saran Restock']);

            foreach ($data['products'] as $product) {
                fputcsv($output, [
                    $product['name'],
                    $product['category'],
                    $product['stock'],
                    $product['minimum_stock'],
                    $product['suggested_restock'],
                ]);
            }

            fclose($output);
        }, 'low-stock-restock.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Build low stock report data.
     *
     * @return array{filters: array{status: string}, summary: array{low_stock_count: int, empty_stock_count: int, suggested_restock_total: int}, products: mixed}
     */
    private function reportData(Request $request): array
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string', 'in:all,empty,low'],
        ]);

        $status = $filters['status'] ?? 'all';

        $query = Product::query()
            ->with('category:id,name')
            ->whereColumn('stock', '<=', 'minimum_stock');

        if ($status === 'empty') {
            $query->where('stock', 0);
        }

        if ($status === 'low') {
            $query->where('stock', '>', 0);
        }

        $products = $query
            ->orderBy('stock')
            ->orderBy('name')
            ->get(['id', 'category_id', 'name', 'stock', 'minimum_stock'])
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category?->name ?? '-',
                'stock' => $product->stock,
                'minimum_stock' => $product->minimum_stock,
                'suggested_restock' => max($product->minimum_stock - $product->stock, 0),
            ]);

        return [
            'filters' => [
                'status' => $status,
            ],
            'summary' => [
                'low_stock_count' => $products->where('stock', '>', 0)->count(),
                'empty_stock_count' => $products->where('stock', 0)->count(),
                'suggested_restock_total' => $products->sum('suggested_restock'),
            ],
            'products' => $products,
        ];
    }
}
