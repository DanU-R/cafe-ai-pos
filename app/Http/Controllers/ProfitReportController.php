<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProfitReportController extends Controller
{
    /**
     * Display daily profit report.
     */
    public function __invoke(Request $request): Response
    {
        $filters = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $date = Carbon::parse($filters['date'] ?? today())->toDateString();

        $completedOrders = Order::query()
            ->whereDate('created_at', $date)
            ->where('status', 'completed')
            ->get();

        $products = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->whereDate('orders.created_at', $date)
            ->where('orders.status', 'completed')
            ->select('order_items.product_name')
            ->selectRaw('SUM(order_items.qty) as sold_qty')
            ->selectRaw('SUM(order_items.subtotal) as revenue')
            ->selectRaw('SUM(order_items.qty * COALESCE(products.cost_price, 0)) as cost')
            ->groupBy('order_items.product_name')
            ->orderByDesc('revenue')
            ->get()
            ->map(function (object $product): array {
                $revenue = (float) $product->revenue;
                $cost = (float) $product->cost;

                return [
                    'product_name' => $product->product_name,
                    'sold_qty' => (int) $product->sold_qty,
                    'revenue' => number_format($revenue, 2, '.', ''),
                    'cost' => number_format($cost, 2, '.', ''),
                    'profit' => number_format($revenue - $cost, 2, '.', ''),
                ];
            });

        $grossSales = (float) $completedOrders->sum('subtotal_amount');
        $discounts = (float) $completedOrders->sum('discount_amount');
        $netSales = (float) $completedOrders->sum('total');
        $cost = $products->sum(fn (array $product): float => (float) $product['cost']);

        return Inertia::render('reports/profit', [
            'filters' => [
                'date' => $date,
            ],
            'summary' => [
                'gross_sales' => number_format($grossSales, 2, '.', ''),
                'discounts' => number_format($discounts, 2, '.', ''),
                'net_sales' => number_format($netSales, 2, '.', ''),
                'cost' => number_format($cost, 2, '.', ''),
                'profit' => number_format($netSales - $cost, 2, '.', ''),
                'transactions' => $completedOrders->count(),
            ],
            'products' => $products,
        ]);
    }
}
