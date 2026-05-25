<?php

namespace App\Services;

use App\Ai\Agents\PredictiveInventoryAgent;
use App\Models\Product;
use App\Models\RawMaterial;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use JsonException;
use Throwable;

class AiPredictiveInventoryService
{
    private const MAX_CANDIDATES = 15;

    private const MAX_RECOMMENDATIONS = 15;

    /**
     * Predict restock urgency for products and raw materials.
     *
     * @return list<array{item_name: string, predicted_days_left: int|float, urgency: string, recommendation: string}>
     */
    public function predict(): array
    {
        $candidates = $this->criticalCandidates();

        if ($candidates === []) {
            return [];
        }

        try {
            return $this->normalize($this->prompt($this->buildPrompt($candidates)));
        } catch (Throwable) {
            return [];
        }
    }

    protected function prompt(string $prompt): string
    {
        return trim((string) (new PredictiveInventoryAgent)->prompt($prompt));
    }

    /**
     * @return list<array{item_type: string, item_name: string, current_stock: float, minimum_stock: float, daily_usage_average: float, unit: string|null, predicted_days_left: float|null}>
     */
    private function criticalCandidates(): array
    {
        return collect()
            ->merge($this->productCandidates())
            ->merge($this->rawMaterialCandidates())
            ->filter(fn (array $item): bool => $this->isCritical($item))
            ->sortBy([
                fn (array $a, array $b): int => ($a['predicted_days_left'] ?? PHP_FLOAT_MAX) <=> ($b['predicted_days_left'] ?? PHP_FLOAT_MAX),
                fn (array $a, array $b): int => ($a['current_stock'] <=> $b['current_stock']),
                fn (array $a, array $b): int => ($b['daily_usage_average'] <=> $a['daily_usage_average']),
            ])
            ->take(self::MAX_CANDIDATES)
            ->values()
            ->all();
    }

    /**
     * @return Collection<int, array{item_type: string, item_name: string, current_stock: float, minimum_stock: float, daily_usage_average: float, unit: string|null, predicted_days_left: float|null}>
     */
    private function productCandidates(): Collection
    {
        $soldAverages = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'completed')
            ->where('orders.created_at', '>=', now()->subDays(7))
            ->whereNotNull('order_items.product_id')
            ->groupBy('order_items.product_id')
            ->select('order_items.product_id')
            ->selectRaw('SUM(order_items.qty) / 7 as daily_usage_average')
            ->pluck('daily_usage_average', 'product_id');

        return Product::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'stock', 'minimum_stock'])
            ->map(function (Product $product) use ($soldAverages): array {
                $dailyUsageAverage = round((float) ($soldAverages[$product->id] ?? 0), 3);
                $currentStock = (float) $product->stock;

                return [
                    'item_type' => 'Product',
                    'item_name' => $product->name,
                    'current_stock' => $currentStock,
                    'minimum_stock' => (float) $product->minimum_stock,
                    'daily_usage_average' => $dailyUsageAverage,
                    'unit' => 'pcs',
                    'predicted_days_left' => $this->predictedDaysLeft($currentStock, $dailyUsageAverage),
                ];
            });
    }

    /**
     * @return Collection<int, array{item_type: string, item_name: string, current_stock: float, minimum_stock: float, daily_usage_average: float, unit: string|null, predicted_days_left: float|null}>
     */
    private function rawMaterialCandidates(): Collection
    {
        $usageAverages = DB::table('product_recipes')
            ->join('order_items', 'order_items.product_id', '=', 'product_recipes.product_id')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', 'completed')
            ->where('orders.created_at', '>=', now()->subDays(7))
            ->groupBy('product_recipes.raw_material_id')
            ->select('product_recipes.raw_material_id')
            ->selectRaw('SUM(order_items.qty * product_recipes.qty) / 7 as daily_usage_average')
            ->pluck('daily_usage_average', 'raw_material_id');

        return RawMaterial::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'unit', 'stock', 'minimum_stock'])
            ->map(function (RawMaterial $material) use ($usageAverages): array {
                $dailyUsageAverage = round((float) ($usageAverages[$material->id] ?? 0), 3);
                $currentStock = (float) $material->stock;

                return [
                    'item_type' => 'RawMaterial',
                    'item_name' => $material->name,
                    'current_stock' => $currentStock,
                    'minimum_stock' => (float) $material->minimum_stock,
                    'daily_usage_average' => $dailyUsageAverage,
                    'unit' => $material->unit,
                    'predicted_days_left' => $this->predictedDaysLeft($currentStock, $dailyUsageAverage),
                ];
            });
    }

    /**
     * @param  array{current_stock: float, minimum_stock: float, daily_usage_average: float, predicted_days_left: float|null}  $item
     */
    private function isCritical(array $item): bool
    {
        return $item['current_stock'] <= $item['minimum_stock']
            || $item['daily_usage_average'] > 0 && ($item['predicted_days_left'] ?? PHP_FLOAT_MAX) <= 7;
    }

    private function predictedDaysLeft(float $currentStock, float $dailyUsageAverage): ?float
    {
        if ($dailyUsageAverage <= 0) {
            return null;
        }

        return round($currentStock / $dailyUsageAverage, 1);
    }

    /**
     * @param  list<array{item_type: string, item_name: string, current_stock: float, minimum_stock: float, daily_usage_average: float, unit: string|null, predicted_days_left: float|null}>  $candidates
     */
    private function buildPrompt(array $candidates): string
    {
        $contextJson = $this->encode(['inventory_candidates' => $candidates]);

        return <<<PROMPT
Kamu adalah analis inventaris cafe.

Tugas:
- Analisis urgensi restock dari stok saat ini, minimum stok, rata-rata penggunaan/penjualan harian 7 hari, dan prediksi hari tersisa.
- Gunakan Bahasa Indonesia singkat untuk recommendation.
- Output WAJIB berupa JSON array valid.
- Setiap object wajib memakai key: item_name, predicted_days_left, urgency, recommendation.
- predicted_days_left wajib angka; gunakan 999 jika daily_usage_average 0 namun stok sudah di bawah minimum.
- urgency wajib salah satu: High, Medium, Low.
- Jangan berikan teks di luar JSON.

Context JSON:
{$contextJson}
PROMPT;
    }

    /**
     * @return list<array{item_name: string, predicted_days_left: int|float, urgency: string, recommendation: string}>
     */
    private function normalize(string $response): array
    {
        $payload = $this->decode($this->stripMarkdownFence($response));

        if (! is_array($payload) || array_is_list($payload) === false) {
            throw new InvalidArgumentException('AI response must be a JSON array.');
        }

        $recommendations = [];

        foreach ($payload as $item) {
            if (! is_array($item)) {
                throw new InvalidArgumentException('AI response item must be an object.');
            }

            $itemName = $item['item_name'] ?? null;
            $predictedDaysLeft = $item['predicted_days_left'] ?? null;
            $urgency = $item['urgency'] ?? null;
            $recommendation = $item['recommendation'] ?? null;

            if (! is_string($itemName) || trim($itemName) === '') {
                throw new InvalidArgumentException('AI response contains invalid item_name.');
            }

            if (! is_int($predictedDaysLeft) && ! is_float($predictedDaysLeft)) {
                throw new InvalidArgumentException('AI response contains invalid predicted_days_left.');
            }

            if (! is_string($urgency) || ! in_array($urgency, ['High', 'Medium', 'Low'], true)) {
                throw new InvalidArgumentException('AI response contains invalid urgency.');
            }

            if (! is_string($recommendation) || trim($recommendation) === '') {
                throw new InvalidArgumentException('AI response contains invalid recommendation.');
            }

            $recommendations[] = [
                'item_name' => trim($itemName),
                'predicted_days_left' => $predictedDaysLeft,
                'urgency' => $urgency,
                'recommendation' => trim($recommendation),
            ];

            if (count($recommendations) >= self::MAX_RECOMMENDATIONS) {
                break;
            }
        }

        return $recommendations;
    }

    private function stripMarkdownFence(string $response): string
    {
        $trimmed = trim($response);

        if (str_starts_with($trimmed, '```')) {
            $trimmed = preg_replace('/^```(?:json)?\s*/i', '', $trimmed) ?? $trimmed;
            $trimmed = preg_replace('/\s*```$/', '', $trimmed) ?? $trimmed;
        }

        return trim($trimmed);
    }

    private function decode(string $json): mixed
    {
        try {
            return json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException('AI response is not valid JSON.', previous: $exception);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function encode(array $data): string
    {
        return json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    }
}
