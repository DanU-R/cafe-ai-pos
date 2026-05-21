<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * Display paginated order history.
     */
    public function index(): Response
    {
        $orders = Order::query()
            ->with('user:id,name')
            ->latest()
            ->paginate(10)
            ->through(fn (Order $order): array => [
                'id' => $order->id,
                'order_code' => $order->order_code,
                'created_at' => $order->created_at?->toISOString(),
                'user' => $order->user ? [
                    'name' => $order->user->name,
                ] : null,
                'total' => $order->total,
                'paid_amount' => $order->paid_amount,
                'change_amount' => $order->change_amount,
                'payment_method' => $order->payment_method,
                'status' => $order->status,
            ]);

        return Inertia::render('orders/index', [
            'orders' => $orders,
        ]);
    }

    /**
     * Display order detail.
     */
    public function show(Order $order): Response
    {
        $order->load([
            'user:id,name',
            'items:id,order_id,product_name,price,qty,subtotal',
        ]);

        return Inertia::render('orders/show', [
            'order' => [
                'id' => $order->id,
                'order_code' => $order->order_code,
                'created_at' => $order->created_at?->toISOString(),
                'user' => $order->user ? [
                    'name' => $order->user->name,
                ] : null,
                'items' => $order->items->map(fn ($item): array => [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'price' => $item->price,
                    'qty' => $item->qty,
                    'subtotal' => $item->subtotal,
                ])->values(),
                'total' => $order->total,
                'paid_amount' => $order->paid_amount,
                'change_amount' => $order->change_amount,
                'payment_method' => $order->payment_method,
                'status' => $order->status,
            ],
        ]);
    }
}
