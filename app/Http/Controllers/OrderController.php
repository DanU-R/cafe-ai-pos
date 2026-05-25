<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\DiningTable;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\ManagerPinApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    /**
     * Display paginated order history.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'string', 'in:completed,pending,cancelled'],
        ]);

        $orders = Order::query()
            ->with(['user:id,name', 'diningTable:id,name'])
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('order_code', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($query) => $query->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Order $order): array => [
                'id' => $order->id,
                'order_code' => $order->order_code,
                'created_at' => $order->created_at?->toISOString(),
                'user' => $order->user ? [
                    'name' => $order->user->name,
                ] : null,
                'subtotal_amount' => $order->subtotal_amount,
                'discount_amount' => $order->discount_amount,
                'total' => $order->total,
                'paid_amount' => $order->paid_amount,
                'change_amount' => $order->change_amount,
                'payment_method' => $order->payment_method,
                'service_type' => $order->service_type,
                'dining_table' => $order->diningTable ? [
                    'name' => $order->diningTable->name,
                ] : null,
                'customer_name' => $order->customer_name,
                'status' => $order->status,
            ]);

        return Inertia::render('orders/index', [
            'orders' => $orders,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
            ],
        ]);
    }

    /**
     * Display order detail.
     */
    public function show(Order $order): Response
    {
        $order->load([
            'user:id,name',
            'diningTable:id,name',
            'cashierShift:id,shift_code',
            'payments:id,order_id,method,amount,reference',
            'refunds.items:id,order_refund_id,product_name,qty,amount',
            'refunds.user:id,name',
            'items.modifiers:id,order_item_id,product_modifier_id,name,price',
            'items.refundItems:id,order_item_id,qty',
        ]);

        $activeStatuses = $this->activeStatuses();

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
                    'refunded_qty' => (int) $item->refundItems->sum('qty'),
                    'subtotal' => $item->subtotal,
                    'modifiers' => $item->modifiers->map(fn ($modifier): array => [
                        'id' => $modifier->id,
                        'name' => $modifier->name,
                        'price' => $modifier->price,
                    ])->values(),
                ])->values(),
                'subtotal_amount' => $order->subtotal_amount,
                'discount_amount' => $order->discount_amount,
                'total' => $order->total,
                'paid_amount' => $order->paid_amount,
                'change_amount' => $order->change_amount,
                'payment_method' => $order->payment_method,
                'service_type' => $order->service_type,
                'dining_table' => $order->diningTable ? [
                    'id' => $order->diningTable->id,
                    'name' => $order->diningTable->name,
                ] : null,
                'cashier_shift' => $order->cashierShift ? [
                    'shift_code' => $order->cashierShift->shift_code,
                ] : null,
                'customer_name' => $order->customer_name,
                'payments' => $order->payments->map(fn ($payment): array => [
                    'id' => $payment->id,
                    'method' => $payment->method,
                    'amount' => $payment->amount,
                    'reference' => $payment->reference,
                ])->values(),
                'refunds' => $order->refunds->map(fn ($refund): array => [
                    'id' => $refund->id,
                    'refund_code' => $refund->refund_code,
                    'created_at' => $refund->created_at?->toISOString(),
                    'amount' => $refund->amount,
                    'method' => $refund->method,
                    'reason' => $refund->reason,
                    'user' => $refund->user ? ['name' => $refund->user->name] : null,
                    'items' => $refund->items->map(fn ($item): array => [
                        'product_name' => $item->product_name,
                        'qty' => $item->qty,
                        'amount' => $item->amount,
                    ])->values(),
                ])->values(),
                'status' => $order->status,
            ],
            'availableTables' => DiningTable::query()
                ->where('is_active', true)
                ->where('status', 'available')
                ->whereDoesntHave('orders', fn ($query) => $query->whereIn('status', $activeStatuses))
                ->orderBy('name')
                ->get(['id', 'name', 'capacity']),
            'activeStatuses' => $activeStatuses,
        ]);
    }

    public function moveTable(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'dining_table_id' => ['required', 'integer', Rule::exists('dining_tables', 'id')->where('is_active', true)],
        ]);

        DB::transaction(function () use ($request, $order, $validated): void {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureActiveDineInOrder($lockedOrder);

            $sourceTableId = $lockedOrder->dining_table_id;
            $destinationTable = DiningTable::query()
                ->whereKey($validated['dining_table_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($sourceTableId === $destinationTable->id) {
                throw ValidationException::withMessages([
                    'dining_table_id' => 'Order sudah berada di meja tersebut.',
                ]);
            }

            if ($destinationTable->status !== 'available' || $this->tableHasActiveOrder($destinationTable->id, $lockedOrder->id)) {
                throw ValidationException::withMessages([
                    'dining_table_id' => 'Meja tujuan sedang terisi.',
                ]);
            }

            $lockedOrder->update(['dining_table_id' => $destinationTable->id]);
            $destinationTable->update(['status' => 'occupied']);

            if ($sourceTableId && ! $this->tableHasActiveOrder($sourceTableId, $lockedOrder->id)) {
                DiningTable::query()->whereKey($sourceTableId)->update(['status' => 'available']);
            }

            $this->audit($request, 'order.move_table', $lockedOrder, [
                'dining_table_id' => $sourceTableId,
            ], [
                'dining_table_id' => $destinationTable->id,
            ]);
        });

        return to_route('orders.show', $order)->with('success', 'Meja order berhasil dipindahkan.');
    }

    public function splitBill(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer', 'distinct', 'exists:order_items,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
        ]);

        $childOrder = DB::transaction(function () use ($request, $order, $validated): Order {
            $parent = Order::query()
                ->with('items.modifiers')
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureActiveOrder($parent);

            $selected = collect($validated['items'])->keyBy('order_item_id');
            $parentItems = $parent->items->keyBy('id');

            foreach ($selected as $itemId => $selection) {
                $item = $parentItems->get((int) $itemId);

                if (! $item) {
                    throw ValidationException::withMessages([
                        'items' => 'Item split harus berasal dari order induk.',
                    ]);
                }

                if ((int) $selection['qty'] > $item->qty) {
                    throw ValidationException::withMessages([
                        'items' => "Qty split {$item->product_name} melebihi qty order.",
                    ]);
                }
            }

            $originalSubtotal = (float) $parent->subtotal_amount;
            $originalDiscount = min((float) $parent->discount_amount, $originalSubtotal);
            $taxRate = $this->rateFromAmounts((float) $parent->tax_amount, $originalSubtotal, $originalDiscount);
            $serviceRate = $this->rateFromAmounts((float) $parent->service_charge_amount, $originalSubtotal, $originalDiscount);

            $child = Order::query()->create([
                'user_id' => $parent->user_id,
                'dining_table_id' => $parent->dining_table_id,
                'cashier_shift_id' => $parent->cashier_shift_id,
                'customer_id' => $parent->customer_id,
                'promotion_id' => $parent->promotion_id,
                'promotion_code' => $parent->promotion_code,
                'order_code' => $this->nextOrderCode(),
                'subtotal_amount' => 0,
                'discount_amount' => 0,
                'tax_amount' => 0,
                'service_charge_amount' => 0,
                'total' => 0,
                'paid_amount' => 0,
                'change_amount' => 0,
                'payment_method' => 'split',
                'service_type' => $parent->service_type,
                'customer_name' => $parent->customer_name,
                'status' => $parent->status,
                'kitchen_status' => $parent->kitchen_status,
            ]);

            foreach ($selected as $itemId => $selection) {
                $item = $parentItems->get((int) $itemId);
                $qty = (int) $selection['qty'];

                if ($qty === $item->qty) {
                    $item->update(['order_id' => $child->id]);

                    continue;
                }

                $remainingQty = $item->qty - $qty;
                $item->update([
                    'qty' => $remainingQty,
                    'subtotal' => round((float) $item->price * $remainingQty, 2),
                ]);

                $childItem = OrderItem::query()->create([
                    'order_id' => $child->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'price' => $item->price,
                    'qty' => $qty,
                    'subtotal' => round((float) $item->price * $qty, 2),
                ]);

                foreach ($item->modifiers as $modifier) {
                    $childItem->modifiers()->create([
                        'product_modifier_id' => $modifier->product_modifier_id,
                        'name' => $modifier->name,
                        'price' => $modifier->price,
                    ]);
                }
            }

            $parent->refresh()->load('items');
            $child->refresh()->load('items');

            $childSubtotal = $this->subtotalFor($child);
            $childDiscount = $originalSubtotal > 0
                ? min(round($originalDiscount * ($childSubtotal / $originalSubtotal), 2), $childSubtotal)
                : 0.0;
            $parentDiscount = min(max(round($originalDiscount - $childDiscount, 2), 0), $this->subtotalFor($parent));

            $this->applyTotals($parent, $parentDiscount, $taxRate, $serviceRate);
            $this->applyTotals($child, $childDiscount, $taxRate, $serviceRate);

            $this->audit($request, 'order.split_bill', $parent, null, [
                'child_order_id' => $child->id,
                'child_order_code' => $child->order_code,
            ]);

            return $child;
        });

        return to_route('orders.show', $childOrder)->with('success', 'Split bill berhasil dibuat.');
    }

    /**
     * Cancel a completed order and restore product stock.
     */
    public function cancel(Request $request, Order $order, ManagerPinApprovalService $approvals): RedirectResponse
    {
        $request->validate([
            'manager_pin' => ['required', 'string', 'min:4', 'max:32'],
        ]);

        DB::transaction(function () use ($request, $order, $approvals): void {
            $lockedOrder = Order::query()
                ->with('items')
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedOrder->status === 'cancelled') {
                return;
            }

            $approvals->approve($request, 'order.cancel', $lockedOrder);

            foreach ($lockedOrder->items as $item) {
                if (! $item->product_id) {
                    continue;
                }

                $product = Product::query()
                    ->whereKey($item->product_id)
                    ->lockForUpdate()
                    ->first();

                if (! $product) {
                    continue;
                }

                $stockBefore = $product->stock;
                $stockAfter = $stockBefore + $item->qty;

                $product->update([
                    'stock' => $stockAfter,
                ]);

                $product->stockMovements()->create([
                    'user_id' => $request->user()?->id,
                    'type' => 'cancel',
                    'qty' => $item->qty,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                    'note' => $lockedOrder->order_code,
                ]);
            }

            $lockedOrder->update([
                'status' => 'cancelled',
            ]);
        });

        return to_route('orders.show', $order)->with('success', 'Order berhasil dibatalkan dan stok dikembalikan.');
    }

    /**
     * @return list<string>
     */
    private function activeStatuses(): array
    {
        return ['pending', 'draft', 'unpaid'];
    }

    private function ensureActiveOrder(Order $order): void
    {
        if (! in_array($order->status, $this->activeStatuses(), true)) {
            throw ValidationException::withMessages([
                'order' => 'Order sudah tidak aktif untuk operasi hospitality.',
            ]);
        }
    }

    private function ensureActiveDineInOrder(Order $order): void
    {
        $this->ensureActiveOrder($order);

        if ($order->service_type !== 'dine_in') {
            throw ValidationException::withMessages([
                'order' => 'Hanya order dine-in yang bisa dipindah meja.',
            ]);
        }
    }

    private function tableHasActiveOrder(int $tableId, ?int $exceptOrderId = null): bool
    {
        return Order::query()
            ->where('dining_table_id', $tableId)
            ->whereIn('status', $this->activeStatuses())
            ->when($exceptOrderId, fn ($query) => $query->whereKeyNot($exceptOrderId))
            ->exists();
    }

    private function subtotalFor(Order $order): float
    {
        return round((float) $order->items()->sum('subtotal'), 2);
    }

    private function rateFromAmounts(float $amount, float $subtotal, float $discount): float
    {
        $base = max($subtotal - $discount, 0);

        return $base > 0 ? $amount / $base : 0.0;
    }

    private function applyTotals(Order $order, float $discount, float $taxRate, float $serviceRate): void
    {
        $subtotal = $this->subtotalFor($order);
        $discount = min(max(round($discount, 2), 0), $subtotal);
        $taxable = max($subtotal - $discount, 0);
        $tax = round($taxable * $taxRate, 2);
        $service = round($taxable * $serviceRate, 2);
        $total = max(round($taxable + $tax + $service, 2), 0);

        $order->update([
            'subtotal_amount' => $subtotal,
            'discount_amount' => $discount,
            'tax_amount' => $tax,
            'service_charge_amount' => $service,
            'total' => $total,
            'paid_amount' => 0,
            'change_amount' => 0,
        ]);
    }

    private function nextOrderCode(): string
    {
        $prefix = 'POS-'.now()->format('Ymd').'-';
        $latestCode = Order::query()
            ->where('order_code', 'like', $prefix.'%')
            ->latest('id')
            ->value('order_code');

        $nextNumber = $latestCode ? ((int) substr($latestCode, -4)) + 1 : 1;

        return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    private function audit(Request $request, string $event, Order $order, ?array $oldValues, ?array $newValues): void
    {
        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => $event,
            'auditable_type' => Order::class,
            'auditable_id' => $order->id,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);
    }
}
