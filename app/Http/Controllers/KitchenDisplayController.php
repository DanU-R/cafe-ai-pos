<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KitchenDisplayController extends Controller
{
    public function index(): Response
    {
        $orders = Order::query()
            ->with(['items:id,order_id,product_name,qty', 'diningTable:id,name,code'])
            ->whereIn('kitchen_status', ['queued', 'preparing', 'ready'])
            ->latest()
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'order_code' => $order->order_code,
                'service_type' => $order->service_type,
                'customer_name' => $order->customer_name,
                'kitchen_status' => $order->kitchen_status,
                'created_at' => $order->created_at?->toISOString(),
                'dining_table' => $order->diningTable ? [
                    'name' => $order->diningTable->name,
                    'code' => $order->diningTable->code,
                ] : null,
                'items' => $order->items->map(fn ($item): array => [
                    'product_name' => $item->product_name,
                    'qty' => $item->qty,
                ])->values(),
            ]);

        return Inertia::render('kitchen/index', [
            'orders' => $orders,
        ]);
    }

    public function update(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'kitchen_status' => ['required', 'string', Rule::in(['queued', 'preparing', 'ready', 'served'])],
        ]);

        $oldStatus = $order->kitchen_status;
        $order->update([
            'kitchen_status' => $validated['kitchen_status'],
            'kitchen_completed_at' => $validated['kitchen_status'] === 'served' ? now() : null,
        ]);

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'order.kitchen_status_updated',
            'auditable_type' => Order::class,
            'auditable_id' => $order->id,
            'old_values' => ['kitchen_status' => $oldStatus],
            'new_values' => ['kitchen_status' => $validated['kitchen_status']],
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return back()->with('success', 'Status dapur diperbarui.');
    }
}
