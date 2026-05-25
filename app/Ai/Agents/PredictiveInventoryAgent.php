<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

class PredictiveInventoryAgent implements Agent
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): string
    {
        return 'Kamu adalah analis inventaris cafe. Output WAJIB berupa JSON array valid tanpa markdown/prosa. Setiap object wajib berisi item_name, predicted_days_left, urgency, recommendation. urgency hanya High, Medium, atau Low.';
    }
}
