<?php

namespace App\Http\Controllers;

use App\Services\AiCartParserService;
use App\Services\AiUpsellRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Throwable;

class AiPosCommandController extends Controller
{
    /**
     * Parse a natural language POS command into cart items.
     */
    public function store(Request $request, AiCartParserService $parser): JsonResponse
    {
        $validated = $request->validate([
            'command' => ['required', 'string', 'max:500'],
        ]);

        try {
            return response()->json([
                'items' => $parser->parse($validated['command']),
            ]);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => 'Perintah belum bisa dipahami. Coba tulis ulang dengan nama menu yang tersedia.',
            ], 422);
        } catch (Throwable $throwable) {
            Log::warning('AI POS command parsing failed.', [
                'exception' => $throwable::class,
                'message' => $throwable->getMessage(),
            ]);

            return response()->json([
                'message' => 'AI command belum tersedia. Coba lagi beberapa saat.',
            ], 422);
        }
    }

    /**
     * Recommend complementary products for the current POS cart.
     */
    public function upsell(Request $request, AiUpsellRecommendationService $recommender): JsonResponse
    {
        $validated = $request->validate([
            'cart_product_ids' => ['present', 'array', 'max:50'],
            'cart_product_ids.*' => ['integer'],
        ]);

        $productIds = $validated['cart_product_ids'];

        if ($productIds === []) {
            return response()->json([
                'recommendations' => [],
            ]);
        }

        return response()->json([
            'recommendations' => $recommender->recommend($productIds),
        ]);
    }
}
