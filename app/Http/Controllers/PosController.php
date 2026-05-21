<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
                ->with('category:id,name')
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'category_id', 'name', 'description', 'price', 'is_active']),
            'checkoutSuccess' => session('checkoutSuccess'),
        ]);
    }

    /**
     * Store a POS checkout.
     */
    public function checkout(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'paid_amount' => ['required', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct'],
            'items.*.qty' => ['required', 'integer', 'min:1'],
        ]);

        $items = collect($validated['items']);
        $products = Product::query()
            ->whereIn('id', $items->pluck('product_id'))
            ->get()
            ->keyBy('id');

        $orderItems = $items->map(function (array $item) use ($products): array {
            $product = $products->get($item['product_id']);

            if (! $product || ! $product->is_active) {
                throw ValidationException::withMessages([
                    'items' => 'Produk tidak tersedia atau sudah tidak aktif.',
                ]);
            }

            $qty = (int) $item['qty'];
            $price = (float) $product->price;

            return [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'price' => $price,
                'qty' => $qty,
                'subtotal' => $price * $qty,
            ];
        });

        $total = $orderItems->sum('subtotal');
        $paidAmount = (float) $validated['paid_amount'];

        if ($paidAmount < $total) {
            throw ValidationException::withMessages([
                'paid_amount' => 'Uang bayar harus lebih besar atau sama dengan total belanja.',
            ]);
        }

        $order = DB::transaction(function () use ($request, $orderItems, $total, $paidAmount): Order {
            $order = Order::create([
                'user_id' => $request->user()?->id,
                'order_code' => $this->nextOrderCode(),
                'total' => $total,
                'paid_amount' => $paidAmount,
                'change_amount' => $paidAmount - $total,
                'payment_method' => 'cash',
                'status' => 'completed',
            ]);

            foreach ($orderItems as $item) {
                $order->items()->create($item);
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
