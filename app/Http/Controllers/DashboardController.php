<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $completedOrders = Order::query()->where('status', 'completed');

        $summary = [
            'revenue' => (string) $completedOrders->clone()->sum('total'),
            'transactions_count' => $completedOrders->clone()->count(),
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

        return Inertia::render('dashboard', [
            'summary' => $summary,
            'recentOrders' => $recentOrders,
            'topProducts' => $topProducts,
        ]);
    }
}
