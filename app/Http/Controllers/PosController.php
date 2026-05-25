<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DiningTable;
use App\Models\Order;
use App\Models\PosSetting;
use App\Models\Product;
use App\Models\ProductModifier;
use App\Models\Promotion;
use App\Models\RawMaterial;
use App\Services\ManagerPinApprovalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    /**
     * Display the cashier page.
     */
    public function index(): Response
    {
        return Inertia::render('pos/index', [
            'categories' => Category::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'products' => Product::query()
                ->with(['category:id,name', 'modifiers' => fn ($query) => $query->where('is_active', true)->orderBy('name')])
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'category_id', 'name', 'description', 'price', 'stock', 'minimum_stock', 'is_active']),
            'diningTables' => DiningTable::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'capacity', 'status']),
            'customers' => Customer::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'phone', 'points']),
            'promotions' => Promotion::query()
                ->where('is_active', true)
                ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()->toDateString()))
                ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()->toDateString()))
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'type', 'promo_type', 'target_id', 'value', 'minimum_spend', 'start_time', 'end_time', 'active_days']),
            'settings' => [
                'tax_percent' => PosSetting::value('tax_percent', '0'),
                'service_charge_percent' => PosSetting::value('service_charge_percent', '0'),
                'qris_base_string' => PosSetting::value('qris_base_string', 'ISI_STRING_QRIS_STATIS_DEFAULT_DISINI'),
            ],
            'checkoutSuccess' => session('checkoutSuccess'),
        ]);
    }

    /**
     * Store a POS checkout.
     */
    public function checkout(Request $request, ManagerPinApprovalService $approvals): RedirectResponse
    {
        $validated = $request->validate([
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'manager_pin' => ['nullable', 'string', 'min:4', 'max:32'],
            'service_charge_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'service_type' => ['nullable', 'string', Rule::in(['takeaway', 'dine_in', 'delivery'])],
            'dining_table_id' => ['nullable', 'integer', 'exists:dining_tables,id'],
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'promotion_code' => ['nullable', 'string', 'max:50'],
            'payments' => ['nullable', 'array', 'min:1'],
            'payments.*.method' => ['required_with:payments', 'string', Rule::in(['cash', 'card', 'qris', 'transfer'])],
            'payments.*.amount' => ['required_with:payments', 'numeric', 'min:0.01'],
            'payments.*.reference' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.modifier_ids' => ['nullable', 'array'],
            'items.*.modifier_ids.*' => ['integer', 'distinct', 'exists:product_modifiers,id'],
        ]);

        $items = collect($validated['items']);
        $payments = collect($validated['payments'] ?? [
            [
                'method' => 'cash',
                'amount' => $validated['paid_amount'] ?? 0,
                'reference' => null,
            ],
        ])->map(fn (array $payment): array => [
            'method' => $payment['method'],
            'amount' => $this->rupiahAmount($payment['amount']),
            'reference' => $payment['reference'] ?? null,
        ]);
        $paidAmount = $this->rupiahAmount($payments->sum('amount'));
        $discountAmount = $this->rupiahAmount($validated['discount_amount'] ?? 0);
        $taxPercent = (float) ($validated['tax_percent'] ?? 0);
        $serviceChargePercent = (float) ($validated['service_charge_percent'] ?? 0);
        $serviceType = $validated['service_type'] ?? 'takeaway';
        $diningTableId = $serviceType === 'dine_in' ? $validated['dining_table_id'] ?? null : null;
        $customerId = $validated['customer_id'] ?? null;

        if ($serviceType === 'dine_in' && ! $diningTableId) {
            throw ValidationException::withMessages([
                'dining_table_id' => 'Meja wajib dipilih untuk pesanan dine-in.',
            ]);
        }

        $order = DB::transaction(function () use ($request, $items, $payments, $paidAmount, $discountAmount, $taxPercent, $serviceChargePercent, $serviceType, $diningTableId, $customerId, $validated, $approvals): Order {
            $cashierShift = CashierShift::query()
                ->where('user_id', $request->user()?->id)
                ->where('status', 'open')
                ->latest('opened_at')
                ->first();

            if (! $cashierShift) {
                throw ValidationException::withMessages([
                    'paid_amount' => 'Buka shift kasir sebelum checkout.',
                ]);
            }

            $products = Product::query()
                ->with('recipes.rawMaterial')
                ->whereIn('id', $items->pluck('product_id')->sort()->values())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');
            $modifiers = ProductModifier::query()
                ->whereIn('id', $items->flatMap(fn (array $item): array => $item['modifier_ids'] ?? [])->unique())
                ->where('is_active', true)
                ->get()
                ->keyBy('id');

            $materialIds = $products
                ->flatMap(fn (Product $product) => $product->recipes->pluck('raw_material_id'))
                ->unique()
                ->values();
            $materials = RawMaterial::query()
                ->whereIn('id', $materialIds->sort()->values())
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $orderItems = $items->map(function (array $item) use ($products, $modifiers): array {
                $product = $products->get($item['product_id']);

                if (! $product || ! $product->is_active) {
                    throw ValidationException::withMessages([
                        'items' => 'Produk tidak tersedia atau sudah tidak aktif.',
                    ]);
                }

                $qty = (int) $item['qty'];

                if ($product->stock < $qty) {
                    throw ValidationException::withMessages([
                        'items' => "Stok {$product->name} tidak cukup. Stok tersedia: {$product->stock}.",
                    ]);
                }

                $selectedModifiers = collect($item['modifier_ids'] ?? [])
                    ->map(fn (int $modifierId) => $modifiers->get($modifierId))
                    ->filter();

                if ($selectedModifiers->contains(fn (ProductModifier $modifier): bool => $modifier->product_id !== $product->id)) {
                    throw ValidationException::withMessages([
                        'items' => 'Modifier tidak sesuai dengan produk.',
                    ]);
                }

                $modifierTotal = $selectedModifiers->sum(fn (ProductModifier $modifier): int => $this->rupiahAmount($modifier->price));
                $price = $this->rupiahAmount($product->price) + $modifierTotal;
                $stockBefore = $product->stock;

                return [
                    'product_id' => $product->id,
                    'category_id' => $product->category_id,
                    'product_name' => $product->name,
                    'price' => $price,
                    'qty' => $qty,
                    'subtotal' => $price * $qty,
                    'modifiers' => $selectedModifiers->map(fn (ProductModifier $modifier): array => [
                        'product_modifier_id' => $modifier->id,
                        'name' => $modifier->name,
                        'price' => (float) $modifier->price,
                    ])->values()->all(),
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockBefore - $qty,
                ];
            });

            foreach ($orderItems as $item) {
                $product = $products->get($item['product_id']);

                foreach ($product->recipes as $recipe) {
                    $material = $materials->get($recipe->raw_material_id);
                    $requiredQty = (float) $recipe->qty * $item['qty'];

                    if (! $material || (float) $material->stock < $requiredQty) {
                        throw ValidationException::withMessages([
                            'items' => "Stok bahan {$recipe->rawMaterial?->name} tidak cukup untuk {$product->name}.",
                        ]);
                    }
                }
            }

            $subtotalAmount = $orderItems->sum('subtotal');
            $promotion = null;
            if (! empty($validated['promotion_code'])) {
                $promotion = Promotion::query()
                    ->where('code', $validated['promotion_code'])
                    ->where('is_active', true)
                    ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()->toDateString()))
                    ->where(fn ($query) => $query->whereNull('ends_at')->orWhere('ends_at', '>=', now()->toDateString()))
                    ->first();

                if (! $promotion) {
                    throw ValidationException::withMessages([
                        'promotion_code' => 'Kode promo tidak valid atau sudah tidak aktif.',
                    ]);
                }

                $promotionLines = $orderItems->map(fn (array $item): array => [
                    'product_id' => $item['product_id'],
                    'category_id' => $item['category_id'],
                    'price' => $item['price'],
                    'qty' => $item['qty'],
                    'subtotal' => $item['subtotal'],
                ]);
                $discountAmount += $promotion->discountForLines($promotionLines);
            }

            if ($discountAmount > $subtotalAmount) {
                throw ValidationException::withMessages([
                    'discount_amount' => 'Diskon tidak boleh lebih besar dari subtotal belanja.',
                ]);
            }

            if ((float) ($validated['discount_amount'] ?? 0) > 0) {
                $approvals->approve($request, 'pos.manual_discount');
            }

            $subtotalAmount = $this->rupiahAmount($subtotalAmount);
            $discountAmount = $this->rupiahAmount($discountAmount);
            $taxableAmount = $this->rupiahAmount($subtotalAmount - $discountAmount);
            $taxAmount = $this->rupiahAmount($taxableAmount * $taxPercent / 100);
            $serviceChargeAmount = $this->rupiahAmount($taxableAmount * $serviceChargePercent / 100);
            $total = $this->rupiahAmount($taxableAmount + $taxAmount + $serviceChargeAmount);
            $changeAmount = $this->rupiahAmount($paidAmount - $total);

            if ($paidAmount < $total) {
                throw ValidationException::withMessages([
                    'paid_amount' => 'Uang bayar harus lebih besar atau sama dengan total belanja.',
                ]);
            }

            $paymentMethod = $payments->pluck('method')->unique()->count() === 1
                ? $payments->first()['method']
                : 'mixed';

            $order = Order::create([
                'user_id' => $request->user()?->id,
                'dining_table_id' => $diningTableId,
                'cashier_shift_id' => $cashierShift->id,
                'customer_id' => $customerId,
                'promotion_id' => $promotion?->id,
                'promotion_code' => $promotion?->code,
                'order_code' => $this->nextOrderCode(),
                'subtotal_amount' => $subtotalAmount,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'service_charge_amount' => $serviceChargeAmount,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
                'payment_method' => $paymentMethod,
                'service_type' => $serviceType,
                'customer_name' => $validated['customer_name'] ?? null,
                'status' => 'completed',
                'kitchen_status' => 'queued',
            ]);

            if ($customerId) {
                Customer::query()->whereKey($customerId)->increment('points', (int) floor($total / 10000));
            }

            AuditLog::query()->create([
                'user_id' => $request->user()?->id,
                'event' => 'order.checkout',
                'auditable_type' => Order::class,
                'auditable_id' => $order->id,
                'new_values' => [
                    'order_code' => $order->order_code,
                    'total' => $total,
                    'payment_method' => $paymentMethod,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
            ]);

            foreach ($payments as $payment) {
                $order->payments()->create([
                    'method' => $payment['method'],
                    'amount' => $payment['amount'],
                    'reference' => $payment['reference'],
                ]);
            }

            foreach ($orderItems as $item) {
                $orderItem = $order->items()->create([
                    'product_id' => $item['product_id'],
                    'product_name' => $item['product_name'],
                    'price' => $item['price'],
                    'qty' => $item['qty'],
                    'subtotal' => $item['subtotal'],
                ]);

                foreach ($item['modifiers'] as $modifier) {
                    $orderItem->modifiers()->create($modifier);
                }

                Product::query()
                    ->whereKey($item['product_id'])
                    ->update(['stock' => $item['stock_after']]);

                Product::query()
                    ->findOrFail($item['product_id'])
                    ->stockMovements()
                    ->create([
                        'user_id' => $request->user()?->id,
                        'type' => 'sale',
                        'qty' => $item['qty'],
                        'stock_before' => $item['stock_before'],
                        'stock_after' => $item['stock_after'],
                        'note' => $order->order_code,
                    ]);
                $product = $products->get($item['product_id']);

                foreach ($product->recipes as $recipe) {
                    $material = $materials->get($recipe->raw_material_id);
                    $materialQty = (float) $recipe->qty * $item['qty'];
                    $materialStockBefore = (float) $material->stock;
                    $materialStockAfter = $materialStockBefore - $materialQty;

                    $material->update(['stock' => $materialStockAfter]);
                    $material->movements()->create([
                        'user_id' => $request->user()?->id,
                        'type' => 'sale',
                        'qty' => $materialQty,
                        'stock_before' => $materialStockBefore,
                        'stock_after' => $materialStockAfter,
                        'note' => $order->order_code.' · '.$product->name,
                    ]);
                }
            }

            return $order;
        });

        return to_route('pos.index')->with('checkoutSuccess', [
            'order_code' => $order->order_code,
        ]);
    }

    /**
     * Generate a unique POS order code.
     */
    private function rupiahAmount(int|float|string|null $amount): int
    {
        return (int) round((float) ($amount ?? 0), 0, PHP_ROUND_HALF_UP);
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
}
