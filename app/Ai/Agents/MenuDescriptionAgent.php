<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

class MenuDescriptionAgent implements Agent
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): string
    {
        return 'Kamu adalah asisten POS kafe. Tugasmu membuat deskripsi menu makanan atau minuman untuk katalog POS. Gunakan Bahasa Indonesia yang natural, singkat, menarik, dan mudah dipahami pelanggan. Jawab hanya dengan deskripsi final, tanpa markdown, tanpa bullet list, dan tanpa penjelasan tambahan.';
    }
}
