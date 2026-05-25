<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Services\ManagerPinApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderRefundController extends Controller
{
    public function store(Request $request, Order $order, ManagerPinApprovalService $approvals): RedirectResponse
    {
        $validated = $request->validate([
            'method' => ['required', 'string', Rule::in(['cash', 'card', 'qris', 'transfer'])],
            'reason' => ['nullable', 'string', 'max:1000'],
            'manager_pin' => ['required', 'string', 'min:4', 'max:32'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'integer', 'exists:order_items,id'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($request, $order, $validated, $approvals): void {
            $lockedOrder = Order::query()
                ->with(['items.refundItems', 'items.product.recipes.rawMaterial'])
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            $approvals->approve($request, 'order.refund', $lockedOrder);

            if ($lockedOrder->status !== 'completed') {
                throw ValidationException::withMessages([
                    'items' => 'Refund hanya bisa dibuat untuk order completed.',
                ]);
            }

            $requestedItems = collect($validated['items'])->keyBy('order_item_id');
            $refundItems = collect();

            foreach ($lockedOrder->items as $item) {
                $requested = $requestedItems->get($item->id);

                if (! $requested) {
                    continue;
                }

                $refundedQty = (int) $item->refundItems->sum('qty');
                $availableQty = $item->qty - $refundedQty;
                $qty = (int) $requested['qty'];

                if ($qty > $availableQty) {
                    throw ValidationException::withMessages([
                        'items' => "Qty refund {$item->product_name} melebihi sisa qty ({$availableQty}).",
                    ]);
                }

                $refundItems->push([
                    'item' => $item,
                    'qty' => $qty,
                    'amount' => (float) $item->price * $qty,
                ]);
            }

            if ($refundItems->isEmpty()) {
                throw ValidationException::withMessages([
                    'items' => 'Pilih item valid untuk refund.',
                ]);
            }

            $refund = $lockedOrder->refunds()->create([
                'user_id' => $request->user()?->id,
                'refund_code' => $this->nextRefundCode(),
                'amount' => $refundItems->sum('amount'),
                'method' => $validated['method'],
                'reason' => $validated['reason'] ?? null,
            ]);

            foreach ($refundItems as $refundItem) {
                $item = $refundItem['item'];
                $qty = $refundItem['qty'];

                $refund->items()->create([
                    'order_item_id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'qty' => $qty,
                    'amount' => $refundItem['amount'],
                ]);

                if ($item->product_id) {
                    $product = Product::query()->whereKey($item->product_id)->lockForUpdate()->first();

                    if ($product) {
                        $stockBefore = $product->stock;
                        $stockAfter = $stockBefore + $qty;
                        $product->update(['stock' => $stockAfter]);
                        $product->stockMovements()->create([
                            'user_id' => $request->user()?->id,
                            'type' => 'refund',
                            'qty' => $qty,
                            'stock_before' => $stockBefore,
                            'stock_after' => $stockAfter,
                            'note' => $refund->refund_code,
                        ]);
                    }
                }

                foreach ($item->product?->recipes ?? [] as $recipe) {
                    $material = RawMaterial::query()->whereKey($recipe->raw_material_id)->lockForUpdate()->first();

                    if (! $material) {
                        continue;
                    }

                    $materialQty = (float) $recipe->qty * $qty;
                    $stockBefore = (float) $material->stock;
                    $stockAfter = $stockBefore + $materialQty;
                    $material->update(['stock' => $stockAfter]);
                    $material->movements()->create([
                        'user_id' => $request->user()?->id,
                        'type' => 'refund',
                        'qty' => $materialQty,
                        'stock_before' => $stockBefore,
                        'stock_after' => $stockAfter,
                        'note' => $refund->refund_code,
                    ]);
                }
            }

            $lockedOrder->load('items.refundItems');
            $allRefunded = $lockedOrder->items->every(fn ($item): bool => (int) $item->refundItems->sum('qty') >= $item->qty);

            if ($allRefunded) {
                $lockedOrder->update(['status' => 'refunded']);
            }
        }, 3);

        return to_route('orders.show', $order)->with('success', 'Refund berhasil dibuat dan stok dikembalikan.');
    }

    private function nextRefundCode(): string
    {
        $prefix = 'RF-'.now()->format('Ymd').'-';
        $latestCode = OrderRefund::query()
            ->where('refund_code', 'like', $prefix.'%')
            ->latest('id')
            ->value('refund_code');

        $nextNumber = $latestCode ? ((int) substr($latestCode, -4)) + 1 : 1;

        return $prefix.str_pad((string) $nextNumber, 4, '0', STR_PAD_LEFT);
    }
}
