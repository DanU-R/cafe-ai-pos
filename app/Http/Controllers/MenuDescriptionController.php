<?php

namespace App\Http\Controllers;

use App\Ai\Agents\MenuDescriptionAgent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MenuDescriptionController extends Controller
{
    /**
     * Show the AI menu description generator page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('ai/menu-description', [
            'generatedDescription' => $request->session()->get('generatedDescription'),
            'generationError' => $request->session()->get('generationError'),
        ]);
    }

    /**
     * Generate a short cafe menu description using Laravel AI.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'ingredients' => ['required', 'string', 'max:500'],
            'tone' => ['required', 'string', 'max:80'],
        ]);

        try {
            $response = (new MenuDescriptionAgent)->prompt(
                $this->prompt($validated),
                model: 'cx/gpt-5.5',
            );

            return to_route('menu-description.edit')
                ->withInput($validated)
                ->with('generatedDescription', trim((string) $response));
        } catch (Throwable $throwable) {
            Log::warning('Menu description generation failed.', [
                'exception' => $throwable::class,
                'message' => $throwable->getMessage(),
            ]);

            return to_route('menu-description.edit')
                ->withInput($validated)
                ->with('generationError', 'Deskripsi menu belum bisa dibuat. Coba lagi beberapa saat.');
        }
    }

    /**
     * Build a focused prompt for the menu description agent.
     *
     * @param  array{name: string, ingredients: string, tone: string}  $data
     */
    private function prompt(array $data): string
    {
        return <<<PROMPT
Buat deskripsi menu kafe/restoran untuk katalog POS.

Nama menu: {$data['name']}
Bahan utama: {$data['ingredients']}
Gaya bahasa: {$data['tone']}

Aturan:
- Gunakan Bahasa Indonesia.
- Tulis 1 paragraf saja.
- Maksimal 2 kalimat.
- Singkat, menarik, dan cocok untuk pelanggan kafe.
- Jangan gunakan markdown, bullet list, atau tanda kutip.
PROMPT;
    }
}
