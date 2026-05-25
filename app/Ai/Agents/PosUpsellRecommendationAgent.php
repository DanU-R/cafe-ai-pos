<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

class PosUpsellRecommendationAgent implements Agent
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): string
    {
        return 'Anda adalah asisten upselling cafe. Rekomendasikan 1-2 produk pelengkap yang aktif dan belum ada di cart. Output ONLY JSON array tanpa markdown/prosa, schema: product_id, reason.';
    }
}
