<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

class PosCartParserAgent implements Agent
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): string
    {
        return 'You are a POS assistant. Match user input against the provided product and modifier list. Output ONLY a JSON array, no prose, no markdown. Each item must use schema keys exactly: product_id, quantity, modifier_ids.';
    }
}
