<?php

namespace App\Http\Controllers;

use App\Services\AiPredictiveInventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class AiInventoryController extends Controller
{
    /**
     * Return cached AI predictive restock recommendations.
     */
    public function predictiveRestock(AiPredictiveInventoryService $service): JsonResponse
    {
        $predictions = Cache::remember(
            'ai_inventory_predictive_restock',
            now()->addMinutes(90),
            fn (): array => $service->predict(),
        );

        return response()->json([
            'predictions' => $predictions,
        ]);
    }
}
