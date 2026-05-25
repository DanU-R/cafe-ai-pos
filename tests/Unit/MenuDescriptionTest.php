<?php

use App\Ai\Agents\MenuDescriptionAgent;
use App\Models\User;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Ai\Prompts\AgentPrompt;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('displays the menu description generator page', function () {
    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create(['role' => 'admin']))
        ->get(route('menu-description.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ai/menu-description')
            ->where('generatedDescription', null)
            ->where('generationError', null),
        );
});

it('generates a menu description using the agent', function () {
    MenuDescriptionAgent::fake(function (string $prompt) {
        expect(str_contains($prompt, 'Es Kopi Susu Aren'))->toBeTrue();
        expect(str_contains($prompt, 'espresso, susu segar, gula aren'))->toBeTrue();
        expect(str_contains($prompt, 'Hangat dan ramah'))->toBeTrue();

        return 'Es kopi susu aren yang lembut dengan paduan espresso, susu segar, dan manis legit gula aren.';
    })->preventStrayPrompts();

    $response = $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create(['role' => 'admin']))
        ->post(route('menu-description.store'), [
            'name' => 'Es Kopi Susu Aren',
            'ingredients' => 'espresso, susu segar, gula aren',
            'tone' => 'Hangat dan ramah',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertSessionHas('generatedDescription', 'Es kopi susu aren yang lembut dengan paduan espresso, susu segar, dan manis legit gula aren.')
        ->assertRedirect(route('menu-description.edit'));

    MenuDescriptionAgent::assertPrompted(fn (AgentPrompt $prompt) => $prompt->contains('Es Kopi Susu Aren'));
});

it('returns a safe fallback message when generation fails', function () {
    MenuDescriptionAgent::fake(function () {
        throw new RuntimeException('Provider unavailable.');
    })->preventStrayPrompts();

    $response = $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create(['role' => 'admin']))
        ->post(route('menu-description.store'), [
            'name' => 'Matcha Latte',
            'ingredients' => 'matcha, susu segar, gula aren',
            'tone' => 'Premium dan elegan',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertSessionHas('generationError', 'Deskripsi menu belum bisa dibuat. Coba lagi beberapa saat.')
        ->assertRedirect(route('menu-description.edit'));

    MenuDescriptionAgent::assertPrompted(fn (AgentPrompt $prompt) => $prompt->contains('Matcha Latte'));
});

it('validates menu description input', function () {
    MenuDescriptionAgent::fake()->preventStrayPrompts();

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create(['role' => 'admin']))
        ->post(route('menu-description.store'), [
            'name' => '',
            'ingredients' => '',
            'tone' => '',
        ])
        ->assertSessionHasErrors(['name', 'ingredients', 'tone']);

    MenuDescriptionAgent::assertNeverPrompted();
});
