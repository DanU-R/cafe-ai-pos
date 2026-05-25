<?php

namespace App\Services;

use App\Ai\Agents\PosCartParserAgent;
use App\Models\Product;
use App\Models\ProductModifier;
use Illuminate\Support\Collection;
use InvalidArgumentException;
use JsonException;

class AiCartParserService
{
    /**
     * Parse a cashier natural language command into normalized cart items.
     *
     * @return list<array{product_id: int, quantity: int, modifier_ids: list<int>}>
     */
    public function parse(string $command): array
    {
        $products = Product::query()
            ->with(['modifiers' => fn ($query) => $query->where('is_active', true)->orderBy('name')])
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        $response = $this->prompt($this->buildPrompt($command, $products));

        return $this->normalize($response, $products);
    }

    protected function prompt(string $prompt): string
    {
        return trim((string) (new PosCartParserAgent)->prompt($prompt));
    }

    /**
     * @param  Collection<int, Product>  $products
     */
    private function buildPrompt(string $command, Collection $products): string
    {
        $context = [
            'products' => $products->map(fn (Product $product): array => [
                'id' => $product->id,
                'name' => $product->name,
            ])->values()->all(),
            'modifiers' => $products
                ->flatMap(fn (Product $product) => $product->modifiers->map(fn (ProductModifier $modifier): array => [
                    'id' => $modifier->id,
                    'product_id' => $modifier->product_id,
                    'name' => $modifier->name,
                ]))
                ->values()
                ->all(),
        ];
        $contextJson = $this->encode($context);

        return <<<PROMPT
Parse this cashier command into POS cart items.

Rules:
- Match only products and modifiers from the provided context.
- Use product IDs and modifier IDs exactly from context.
- Quantity must be an integer >= 1.
- If no modifier matches, use an empty array.
- If a requested product cannot be matched, omit it.
- Output ONLY valid JSON array with objects using exactly: product_id, quantity, modifier_ids.

Context JSON:
{$contextJson}

Cashier command:
{$command}
PROMPT;
    }

    /**
     * @param  Collection<int, Product>  $products
     * @return list<array{product_id: int, quantity: int, modifier_ids: list<int>}>
     */
    private function normalize(string $response, Collection $products): array
    {
        $payload = $this->decode($this->stripMarkdownFence($response));
        $productIds = $products->pluck('id')->map(fn (int $id): int => $id)->all();
        $modifierProductIds = $products
            ->flatMap(fn (Product $product) => $product->modifiers->mapWithKeys(fn (ProductModifier $modifier): array => [$modifier->id => $product->id]))
            ->all();

        if (! is_array($payload) || array_is_list($payload) === false) {
            throw new InvalidArgumentException('AI response must be a JSON array.');
        }

        $items = [];

        foreach ($payload as $item) {
            if (! is_array($item)) {
                throw new InvalidArgumentException('AI response item must be an object.');
            }

            $productId = $item['product_id'] ?? null;
            $quantity = $item['quantity'] ?? null;
            $modifierIds = $item['modifier_ids'] ?? [];

            if (! is_int($productId) || ! in_array($productId, $productIds, true)) {
                throw new InvalidArgumentException('AI response contains an invalid product ID.');
            }

            if (! is_int($quantity) || $quantity < 1) {
                throw new InvalidArgumentException('AI response contains an invalid quantity.');
            }

            if (! is_array($modifierIds) || array_is_list($modifierIds) === false) {
                throw new InvalidArgumentException('AI response contains invalid modifier IDs.');
            }

            $validModifierIds = [];

            foreach ($modifierIds as $modifierId) {
                if (! is_int($modifierId) || ($modifierProductIds[$modifierId] ?? null) !== $productId) {
                    throw new InvalidArgumentException('AI response contains modifier IDs that do not match the product.');
                }

                $validModifierIds[] = $modifierId;
            }

            $items[] = [
                'product_id' => $productId,
                'quantity' => $quantity,
                'modifier_ids' => array_values(array_unique($validModifierIds)),
            ];
        }

        return $items;
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
