<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SalesReportController extends Controller
{
    /**
     * Display daily sales report.
     */
    public function __invoke(Request $request): Response
    {
        $filters = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $date = Carbon::parse($filters['date'] ?? today())->toDateString();

        $orders = Order::query()
            ->with('user:id,name')
            ->whereDate('created_at', $date)
            ->latest()
            ->get();

        $completedOrders = $orders->where('status', 'completed');

        $topProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereDate('orders.created_at', $date)
            ->where('orders.status', 'completed')
            ->select('order_items.product_name')
            ->selectRaw('SUM(order_items.qty) as sold_qty')
            ->selectRaw('SUM(order_items.subtotal) as gross_sales')
            ->groupBy('order_items.product_name')
            ->orderByDesc('sold_qty')
            ->limit(5)
            ->get()
            ->map(fn (object $product): array => [
                'product_name' => $product->product_name,
                'sold_qty' => (int) $product->sold_qty,
                'gross_sales' => (string) $product->gross_sales,
            ]);

        return Inertia::render('reports/sales', [
            'filters' => [
                'date' => $date,
            ],
            'summary' => [
                'gross_sales' => (string) $completedOrders->sum('subtotal_amount'),
                'discounts' => (string) $completedOrders->sum('discount_amount'),
                'net_sales' => (string) $completedOrders->sum('total'),
                'transactions' => $completedOrders->count(),
                'cancelled_transactions' => $orders->where('status', 'cancelled')->count(),
            ],
            'orders' => $orders->map(fn (Order $order): array => [
                'id' => $order->id,
                'order_code' => $order->order_code,
                'created_at' => $order->created_at?->toISOString(),
                'cashier' => $order->user?->name,
                'subtotal_amount' => $order->subtotal_amount,
                'discount_amount' => $order->discount_amount,
                'total' => $order->total,
                'status' => $order->status,
            ])->values(),
            'topProducts' => $topProducts,
        ]);
    }
}
