<?php

namespace Database\Seeders;

use App\Models\CashDrawerMovement;
use App\Models\CashierShift;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DiningTable;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\PosSetting;
use App\Models\Product;
use App\Models\ProductModifier;
use App\Models\ProductRecipe;
use App\Models\Promotion;
use App\Models\RawMaterial;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Carbon::setTestNow(now()->startOfMinute());

        $users = $this->seedUsers();
        $categories = $this->seedCategories();
        $materials = $this->seedRawMaterials();
        $products = $this->seedProducts($categories);
        $this->seedRecipes($products, $materials);
        $this->seedModifiers($products);
        $promotions = $this->seedPromotions($products, $categories);
        $customers = $this->seedCustomers();
        $tables = $this->seedDiningTables();
        $this->seedOperationalTransactions($users, $products, $promotions, $customers, $tables);
        $this->seedPosSettings();

        Carbon::setTestNow();
    }

    private function seedPosSettings(): void
    {
        PosSetting::query()->updateOrCreate(
            ['key' => 'qris_base_string'],
            ['value' => 'ISI_STRING_QRIS_STATIS_DEFAULT_DISINI'],
        );
    }

    /**
     * @return array<string, User>
     */
    private function seedUsers(): array
    {
        return [
            'owner' => User::create([
                'name' => 'Cafe Owner',
                'email' => 'owner@cafe.test',
                'role' => 'super_admin',
                'password' => 'password',
                'manager_pin_hash' => Hash::make('123456'),
            ]),
            'cashier1' => User::create([
                'name' => 'Rina Cashier',
                'email' => 'cashier1@cafe.test',
                'role' => 'cashier',
                'password' => 'password',
            ]),
            'cashier2' => User::create([
                'name' => 'Dimas Cashier',
                'email' => 'cashier2@cafe.test',
                'role' => 'cashier',
                'password' => 'password',
            ]),
        ];
    }

    /**
     * @return array<string, Category>
     */
    private function seedCategories(): array
    {
        return collect(['Coffee', 'Non-Coffee', 'Pastry', 'Snack'])
            ->mapWithKeys(fn (string $name): array => [Str::slug($name, '_') => Category::create(['name' => $name])])
            ->all();
    }

    /**
     * @return array<string, RawMaterial>
     */
    private function seedRawMaterials(): array
    {
        $materials = [
            'kopi_biji' => ['Kopi Biji', 'gram', 18500, 3500, 180],
            'susu_uht' => ['Susu UHT', 'ml', 42000, 8000, 18],
            'sirup_gula_aren' => ['Sirup Gula Aren', 'ml', 14500, 3000, 65],
            'sirup_vanilla' => ['Sirup Vanilla', 'ml', 9000, 2000, 75],
            'tepung_croissant' => ['Tepung Croissant', 'gram', 28000, 5000, 45],
            'coklat_bubuk' => ['Coklat Bubuk', 'gram', 8500, 1500, 95],
            'matcha' => ['Matcha', 'gram', 3200, 700, 220],
            'kentang' => ['Kentang', 'gram', 52000, 9000, 22],
            'minyak_goreng' => ['Minyak Goreng', 'ml', 30000, 6000, 24],
        ];

        return collect($materials)
            ->mapWithKeys(fn (array $material, string $key): array => [$key => RawMaterial::create([
                'name' => $material[0],
                'unit' => $material[1],
                'stock' => $material[2],
                'minimum_stock' => $material[3],
                'cost_per_unit' => $material[4],
                'is_active' => true,
            ])])
            ->all();
    }

    /**
     * @param  array<string, Category>  $categories
     * @return array<string, Product>
     */
    private function seedProducts(array $categories): array
    {
        $products = [
            'kopi_susu_gula_aren' => [$categories['coffee'], 'Kopi Susu Gula Aren', 'Espresso, susu segar, gula aren.', 28000, 11500, 120, 20],
            'americano' => [$categories['coffee'], 'Americano', 'Espresso dengan air panas.', 22000, 7600, 100, 18],
            'vanilla_latte' => [$categories['coffee'], 'Vanilla Latte', 'Latte creamy dengan sirup vanilla.', 32000, 13500, 90, 15],
            'chocolate_milk' => [$categories['non_coffee'], 'Chocolate Milk', 'Susu coklat dingin favorit keluarga.', 26000, 10800, 85, 14],
            'croissant_butter' => [$categories['pastry'], 'Croissant Butter', 'Croissant butter flaky dipanggang harian.', 24000, 9800, 45, 8],
            'kentang_goreng' => [$categories['snack'], 'Kentang Goreng', 'Kentang goreng renyah dengan saus.', 25000, 9200, 70, 12],
        ];

        return collect($products)
            ->mapWithKeys(fn (array $product, string $key): array => [$key => Product::create([
                'category_id' => $product[0]->id,
                'name' => $product[1],
                'description' => $product[2],
                'price' => $product[3],
                'cost_price' => $product[4],
                'stock' => $product[5],
                'minimum_stock' => $product[6],
                'is_active' => true,
            ])])
            ->all();
    }

    /**
     * @param  array<string, Product>  $products
     * @param  array<string, RawMaterial>  $materials
     */
    private function seedRecipes(array $products, array $materials): void
    {
        $recipes = [
            'kopi_susu_gula_aren' => ['kopi_biji' => 18, 'susu_uht' => 160, 'sirup_gula_aren' => 25],
            'americano' => ['kopi_biji' => 18],
            'vanilla_latte' => ['kopi_biji' => 18, 'susu_uht' => 170, 'sirup_vanilla' => 20],
            'chocolate_milk' => ['susu_uht' => 180, 'coklat_bubuk' => 28],
            'croissant_butter' => ['tepung_croissant' => 95],
            'kentang_goreng' => ['kentang' => 180, 'minyak_goreng' => 35],
        ];

        foreach ($recipes as $productKey => $recipe) {
            foreach ($recipe as $materialKey => $qty) {
                ProductRecipe::create([
                    'product_id' => $products[$productKey]->id,
                    'raw_material_id' => $materials[$materialKey]->id,
                    'qty' => $qty,
                ]);
            }
        }
    }

    /**
     * @param  array<string, Product>  $products
     */
    private function seedModifiers(array $products): void
    {
        $defaults = [
            ['Ice', 0],
            ['Hot', 0],
            ['Less Sugar', 0],
            ['Extra Shot', 7000],
            ['Oat Milk', 9000],
            ['Extra Syrup', 5000],
        ];

        foreach (['kopi_susu_gula_aren', 'americano', 'vanilla_latte', 'chocolate_milk'] as $productKey) {
            foreach ($defaults as [$name, $price]) {
                ProductModifier::create([
                    'product_id' => $products[$productKey]->id,
                    'name' => $name,
                    'price' => $price,
                    'is_active' => true,
                ]);
            }
        }
    }

    /**
     * @param  array<string, Product>  $products
     * @param  array<string, Category>  $categories
     * @return array<string, Promotion>
     */
    private function seedPromotions(array $products, array $categories): array
    {
        return [
            'happy_hour' => Promotion::create([
                'name' => 'Happy Hour Coffee 15%',
                'code' => 'HAPPY15',
                'type' => 'percent',
                'promo_type' => 'happy_hour',
                'target_id' => $categories['coffee']->id,
                'value' => 15,
                'minimum_spend' => 30000,
                'starts_at' => now()->subMonth()->toDateString(),
                'ends_at' => now()->addMonth()->toDateString(),
                'start_time' => '00:00:00',
                'end_time' => '23:59:59',
                'active_days' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                'is_active' => true,
            ]),
            'bogo' => Promotion::create([
                'name' => 'BOGO Americano',
                'code' => 'BOGOAMERICANO',
                'type' => 'fixed',
                'promo_type' => 'bogo',
                'target_id' => $products['americano']->id,
                'value' => 0,
                'minimum_spend' => 0,
                'starts_at' => now()->subMonth()->toDateString(),
                'ends_at' => now()->addMonth()->toDateString(),
                'is_active' => true,
            ]),
        ];
    }

    /**
     * @return array<int, Customer>
     */
    private function seedCustomers(): array
    {
        return collect([
            ['Ayu Prameswari', '081200001001', 'ayu@cafe.test', 120],
            ['Bima Santoso', '081200001002', 'bima@cafe.test', 80],
            ['Citra Lestari', '081200001003', 'citra@cafe.test', 45],
            ['Dewi Anggraini', '081200001004', 'dewi@cafe.test', 150],
        ])->map(fn (array $customer): Customer => Customer::create([
            'name' => $customer[0],
            'phone' => $customer[1],
            'email' => $customer[2],
            'points' => $customer[3],
            'is_active' => true,
            'note' => 'Demo loyalty customer.',
        ]))->all();
    }

    /**
     * @return array<int, DiningTable>
     */
    private function seedDiningTables(): array
    {
        return collect([
            ['T01', 2],
            ['T02', 2],
            ['T03', 4],
            ['T04', 4],
            ['T05', 6],
            ['Outdoor 1', 4],
        ])->map(fn (array $table): DiningTable => DiningTable::create([
            'name' => $table[0],
            'capacity' => $table[1],
            'status' => 'available',
            'is_active' => true,
        ]))->all();
    }

    /**
     * @param  array<string, User>  $users
     * @param  array<string, Product>  $products
     * @param  array<string, Promotion>  $promotions
     * @param  array<int, Customer>  $customers
     * @param  array<int, DiningTable>  $tables
     */
    private function seedOperationalTransactions(array $users, array $products, array $promotions, array $customers, array $tables): void
    {
        $dailyQuantities = [
            6 => ['kopi_susu_gula_aren' => 10, 'americano' => 5, 'croissant_butter' => 4, 'kentang_goreng' => 3],
            5 => ['kopi_susu_gula_aren' => 13, 'americano' => 7, 'croissant_butter' => 5, 'kentang_goreng' => 4],
            4 => ['kopi_susu_gula_aren' => 12, 'americano' => 6, 'croissant_butter' => 6, 'kentang_goreng' => 5],
            3 => ['kopi_susu_gula_aren' => 16, 'americano' => 9, 'croissant_butter' => 8, 'kentang_goreng' => 6],
            2 => ['kopi_susu_gula_aren' => 18, 'americano' => 10, 'croissant_butter' => 9, 'kentang_goreng' => 7],
            1 => ['kopi_susu_gula_aren' => 20, 'americano' => 12, 'croissant_butter' => 10, 'kentang_goreng' => 8],
            0 => ['kopi_susu_gula_aren' => 14, 'americano' => 8, 'croissant_butter' => 7, 'kentang_goreng' => 5],
        ];

        foreach ($dailyQuantities as $daysAgo => $quantities) {
            $date = now()->subDays($daysAgo);
            $cashier = $daysAgo % 2 === 0 ? $users['cashier1'] : $users['cashier2'];
            $shift = $this->createShift($cashier, $date, $daysAgo);
            $this->createDailyOrders($shift, $cashier, $date, $quantities, $products, $promotions, $customers, $tables, $daysAgo);
            $this->closeShift($shift);
        }

        CashierShift::create([
            'user_id' => $users['cashier1']->id,
            'shift_code' => 'SHIFT-'.now()->format('Ymd').'-OPEN',
            'opened_at' => now()->setTime(8, 0),
            'opening_cash' => 500000,
            'expected_cash' => 500000,
            'expected_bca' => 0,
            'expected_qris' => 0,
            'status' => 'open',
            'note' => 'Demo open shift for current trading day.',
        ]);
    }

    private function createShift(User $cashier, CarbonInterface $date, int $daysAgo): CashierShift
    {
        $shift = CashierShift::create([
            'user_id' => $cashier->id,
            'shift_code' => 'SHIFT-'.$date->format('Ymd').'-'.($daysAgo % 2 === 0 ? 'AM' : 'PM'),
            'opened_at' => $date->copy()->setTime(8, 0),
            'opening_cash' => 500000,
            'expected_cash' => 500000,
            'expected_bca' => 0,
            'expected_qris' => 0,
            'status' => 'open',
            'note' => 'Demo historical shift.',
        ]);

        CashDrawerMovement::create([
            'cashier_shift_id' => $shift->id,
            'user_id' => $cashier->id,
            'type' => 'cash_in',
            'amount' => 500000,
            'note' => 'Opening cash float.',
        ]);

        return $shift;
    }

    /**
     * @param  array<string, int>  $quantities
     * @param  array<string, Product>  $products
     * @param  array<string, Promotion>  $promotions
     * @param  array<int, Customer>  $customers
     * @param  array<int, DiningTable>  $tables
     */
    private function createDailyOrders(CashierShift $shift, User $cashier, CarbonInterface $date, array $quantities, array $products, array $promotions, array $customers, array $tables, int $daysAgo): void
    {
        $orderNumber = 1;
        $batches = [
            ['kopi_susu_gula_aren' => 2, 'americano' => 1, 'croissant_butter' => 1],
            ['kopi_susu_gula_aren' => 3, 'kentang_goreng' => 1],
            ['americano' => 2, 'croissant_butter' => 1],
            ['kopi_susu_gula_aren' => 2, 'americano' => 1, 'kentang_goreng' => 1],
            ['kopi_susu_gula_aren' => 1, 'croissant_butter' => 2],
        ];

        while (array_sum($quantities) > 0) {
            $lines = [];
            $batch = $batches[($orderNumber - 1) % count($batches)];

            foreach ($batch as $productKey => $wantedQty) {
                if (($quantities[$productKey] ?? 0) <= 0) {
                    continue;
                }

                $qty = min($wantedQty, $quantities[$productKey]);
                $quantities[$productKey] -= $qty;
                $lines[$productKey] = $qty;
            }

            if ($lines === []) {
                $productKey = collect($quantities)->filter(fn (int $qty): bool => $qty > 0)->keys()->first();
                $lines[$productKey] = 1;
                $quantities[$productKey]--;
            }

            $orderedAt = $date->copy()->setTime(9 + (($orderNumber * 37) % 10), ($orderNumber * 11) % 60);
            $this->createOrder($shift, $cashier, $orderedAt, $lines, $products, $promotions, $customers, $tables, $daysAgo, $orderNumber);
            $orderNumber++;
        }
    }

    /**
     * @param  array<string, int>  $lines
     * @param  array<string, Product>  $products
     * @param  array<string, Promotion>  $promotions
     * @param  array<int, Customer>  $customers
     * @param  array<int, DiningTable>  $tables
     */
    private function createOrder(CashierShift $shift, User $cashier, CarbonInterface $orderedAt, array $lines, array $products, array $promotions, array $customers, array $tables, int $daysAgo, int $orderNumber): void
    {
        $subtotal = collect($lines)->sum(fn (int $qty, string $productKey): float => (float) $products[$productKey]->price * $qty);
        $promotion = $orderNumber % 6 === 0 ? $promotions['happy_hour'] : null;
        $discount = $promotion ? round($subtotal * 0.15, 2) : 0.0;
        $serviceCharge = round(($subtotal - $discount) * 0.05, 2);
        $tax = round(($subtotal - $discount + $serviceCharge) * 0.11, 2);
        $total = round($subtotal - $discount + $serviceCharge + $tax, 2);
        $paymentMethod = ['cash', 'card', 'qris', 'bca'][$orderNumber % 4];
        $paidAmount = $paymentMethod === 'cash' ? ceil($total / 5000) * 5000 : $total;

        $order = Order::forceCreate([
            'user_id' => $cashier->id,
            'dining_table_id' => $orderNumber % 3 === 0 ? $tables[$orderNumber % count($tables)]->id : null,
            'cashier_shift_id' => $shift->id,
            'customer_id' => $orderNumber % 4 === 0 ? $customers[$orderNumber % count($customers)]->id : null,
            'promotion_id' => $promotion?->id,
            'promotion_code' => $promotion?->code,
            'order_code' => 'ORD-'.$orderedAt->format('Ymd').'-'.str_pad((string) $orderNumber, 3, '0', STR_PAD_LEFT),
            'subtotal_amount' => $subtotal,
            'discount_amount' => $discount,
            'tax_amount' => $tax,
            'service_charge_amount' => $serviceCharge,
            'total' => $total,
            'paid_amount' => $paidAmount,
            'change_amount' => round($paidAmount - $total, 2),
            'payment_method' => $paymentMethod,
            'service_type' => $orderNumber % 3 === 0 ? 'dine_in' : 'takeaway',
            'customer_name' => ['Walk-in Guest', 'Office Regular', 'Online Pickup'][$orderNumber % 3],
            'status' => 'completed',
            'kitchen_status' => 'completed',
            'kitchen_completed_at' => $orderedAt->copy()->addMinutes(12),
            'created_at' => $orderedAt,
            'updated_at' => $orderedAt,
        ]);

        foreach ($lines as $productKey => $qty) {
            OrderItem::forceCreate([
                'order_id' => $order->id,
                'product_id' => $products[$productKey]->id,
                'product_name' => $products[$productKey]->name,
                'price' => $products[$productKey]->price,
                'qty' => $qty,
                'subtotal' => (float) $products[$productKey]->price * $qty,
                'created_at' => $orderedAt,
                'updated_at' => $orderedAt,
            ]);
        }

        OrderPayment::forceCreate([
            'order_id' => $order->id,
            'method' => $paymentMethod,
            'amount' => $total,
            'reference' => $paymentMethod === 'cash' ? null : strtoupper($paymentMethod).'-'.$orderedAt->format('YmdHis').'-'.$orderNumber,
            'created_at' => $orderedAt,
            'updated_at' => $orderedAt,
        ]);
    }

    private function closeShift(CashierShift $shift): void
    {
        $orders = $shift->orders()->with('payments')->get();
        $cashSales = $orders->where('payment_method', 'cash')->sum('total');
        $bcaSales = $orders->whereIn('payment_method', ['card', 'bca'])->sum('total');
        $qrisSales = $orders->where('payment_method', 'qris')->sum('total');
        $cashDifference = $shift->id % 2 === 0 ? 0 : 2000;

        $shift->update([
            'closed_at' => $shift->opened_at->copy()->setTime(22, 15),
            'expected_cash' => (float) $shift->opening_cash + (float) $cashSales,
            'actual_cash' => (float) $shift->opening_cash + (float) $cashSales + $cashDifference,
            'expected_bca' => $bcaSales,
            'actual_bca' => $bcaSales,
            'expected_qris' => $qrisSales,
            'actual_qris' => $qrisSales,
            'cash_difference' => $cashDifference,
            'status' => 'closed',
            'note' => $cashDifference === 0 ? 'Balanced demo shift.' : 'Minor rounding variance demo shift.',
        ]);
    }
}
