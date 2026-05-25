<?php

namespace App\Services;

use App\Ai\Agents\PosUpsellRecommendationAgent;
use App\Models\Product;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use JsonException;
use Throwable;

class AiUpsellRecommendationService
{
    /**
     * Recommend complementary active products for the current POS cart.
     *
     * @param  list<int>  $productIds
     * @return list<array{product_id: int, reason: string}>
     */
    public function recommend(array $productIds): array
    {
        $cartProductIds = collect($productIds)
            ->filter(fn (mixed $id): bool => is_int($id))
            ->unique()
            ->values();

        if ($cartProductIds->isEmpty()) {
            return [];
        }

        $products = Product::query()
            ->with('category:id,name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'category_id', 'name']);

        $cartProducts = $products
            ->whereIn('id', $cartProductIds->all())
            ->values();

        if ($cartProducts->isEmpty()) {
            return [];
        }

        try {
            $response = $this->prompt($this->buildPrompt($cartProductIds->all(), $cartProducts, $products));

            return $this->normalize($response, $cartProductIds->all(), $products);
        } catch (Throwable) {
            return [];
        }
    }

    protected function prompt(string $prompt): string
    {
        return trim((string) (new PosUpsellRecommendationAgent)->prompt($prompt));
    }

    /**
     * @param  list<int>  $cartProductIds
     * @param  Collection<int, Product>  $cartProducts
     * @param  Collection<int, Product>  $products
     */
    private function buildPrompt(array $cartProductIds, Collection $cartProducts, Collection $products): string
    {
        $context = [
            'cart_product_ids' => $cartProductIds,
            'cart_products' => $cartProducts->map(fn (Product $product): array => $this->productContext($product))->values()->all(),
            'available_products' => $products
                ->reject(fn (Product $product): bool => in_array($product->id, $cartProductIds, true))
                ->map(fn (Product $product): array => $this->productContext($product))
                ->values()
                ->all(),
            'all_active_products' => $products->map(fn (Product $product): array => $this->productContext($product))->values()->all(),
        ];
        $contextJson = $this->encode($context);

        return <<<PROMPT
Anda adalah asisten upselling cafe.

Tugas:
- Analisis produk yang saat ini ada di cart.
- Rekomendasikan 1-2 produk aktif yang saling melengkapi.
- Produk rekomendasi wajib berasal dari available_products.
- Jangan rekomendasikan product_id yang sudah ada di cart_product_ids.
- Alasan singkat dalam Bahasa Indonesia, natural untuk kasir cafe.
- Output ONLY JSON array valid dengan object: {"product_id": 5, "reason": "Cocok disajikan dengan kopi susu"}.
- Jangan gunakan markdown, code fence, atau prose.

Context JSON:
{$contextJson}
PROMPT;
    }

    /**
     * @return array{id: int, name: string, category_id: int|null, category_name: string|null}
     */
    private function productContext(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'category_id' => $product->category_id,
            'category_name' => $product->category?->name,
        ];
    }

    /**
     * @param  list<int>  $cartProductIds
     * @param  Collection<int, Product>  $products
     * @return list<array{product_id: int, reason: string}>
     */
    private function normalize(string $response, array $cartProductIds, Collection $products): array
    {
        $payload = $this->decode($this->stripMarkdownFence($response));

        if (! is_array($payload) || array_is_list($payload) === false) {
            throw new InvalidArgumentException('AI response must be a JSON array.');
        }

        $activeProductIds = $products->pluck('id')->map(fn (int $id): int => $id)->all();
        $recommendations = [];
        $seenProductIds = [];

        foreach ($payload as $item) {
            if (! is_array($item)) {
                throw new InvalidArgumentException('AI response item must be an object.');
            }

            $productId = $item['product_id'] ?? null;
            $reason = $item['reason'] ?? null;

            if (! is_int($productId) || ! is_string($reason) || trim($reason) === '') {
                throw new InvalidArgumentException('AI response contains invalid recommendation shape.');
            }

            if (in_array($productId, $cartProductIds, true) || ! in_array($productId, $activeProductIds, true) || in_array($productId, $seenProductIds, true)) {
                continue;
            }

            $seenProductIds[] = $productId;
            $recommendations[] = [
                'product_id' => $productId,
                'reason' => trim($reason),
            ];

            if (count($recommendations) >= 2) {
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
