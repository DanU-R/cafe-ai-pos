<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response|RedirectResponse
    {
        if ($request->user()?->role === 'cashier') {
            return redirect()->route('pos.index');
        }

        $today = today()->toDateString();
        $completedOrders = Order::query()->where('status', 'completed');
        $todayOrders = $completedOrders->clone()->whereDate('created_at', $today);

        $todayProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->whereDate('orders.created_at', $today)
            ->where('orders.status', 'completed')
            ->selectRaw('SUM(order_items.qty * COALESCE(products.cost_price, 0)) as cost')
            ->first();

        $todayRevenue = (float) $todayOrders->clone()->sum('total');
        $todayCost = (float) ($todayProducts?->cost ?? 0);

        $summary = [
            'revenue' => (string) $completedOrders->clone()->sum('total'),
            'transactions_count' => $completedOrders->clone()->count(),
            'today_revenue' => number_format($todayRevenue, 2, '.', ''),
            'today_profit' => number_format($todayRevenue - $todayCost, 2, '.', ''),
            'today_transactions_count' => $todayOrders->clone()->count(),
            'low_stock_count' => Product::query()
                ->whereColumn('stock', '<=', 'minimum_stock')
                ->where('stock', '>', 0)
                ->count(),
            'empty_stock_count' => Product::query()
                ->whereColumn('stock', '<=', 'minimum_stock')
                ->where('stock', 0)
                ->count(),
        ];

        $recentOrders = $completedOrders->clone()
            ->with('user:id,name')
            ->latest('id')
            ->limit(5)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'order_code' => $order->order_code,
                'created_at' => $order->created_at?->toISOString(),
                'user' => $order->user ? [
                    'name' => $order->user->name,
                ] : null,
                'total' => $order->total,
                'status' => $order->status,
            ]);

        $topProducts = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'completed')
            ->select('order_items.product_name')
            ->selectRaw('SUM(order_items.qty) as qty_sold')
            ->selectRaw('SUM(order_items.subtotal) as revenue')
            ->groupBy('order_items.product_name')
            ->orderByDesc('qty_sold')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn (object $product): array => [
                'product_name' => $product->product_name,
                'qty_sold' => (int) $product->qty_sold,
                'revenue' => (string) $product->revenue,
            ]);

        $salesChart = collect(range(6, 0))->map(function (int $daysAgo): array {
            $date = today()->subDays($daysAgo)->toDateString();
            $revenue = Order::query()
                ->where('status', 'completed')
                ->whereDate('created_at', $date)
                ->sum('total');

            return [
                'date' => $date,
                'label' => Carbon::parse($date)->translatedFormat('d M'),
                'revenue' => (string) $revenue,
            ];
        });

        $lowStockProducts = Product::query()
            ->with('category:id,name')
            ->whereColumn('stock', '<=', 'minimum_stock')
            ->orderBy('stock')
            ->orderBy('name')
            ->limit(5)
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
                'category' => $product->category ? [
                    'name' => $product->category->name,
                ] : null,
                'stock' => $product->stock,
                'minimum_stock' => $product->minimum_stock,
                'suggested_restock' => max($product->minimum_stock - $product->stock, 0),
            ]);

        return Inertia::render('dashboard', [
            'summary' => $summary,
            'recentOrders' => $recentOrders,
            'topProducts' => $topProducts,
            'salesChart' => $salesChart,
            'lowStockProducts' => $lowStockProducts,
        ]);
    }
}
