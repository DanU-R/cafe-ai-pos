<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\AiUpsellRecommendationService;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;

it('returns mocked AI upsell recommendations for current cart products', function () {
    $user = User::factory()->create();
    $category = Category::query()->create(['name' => 'AI Upsell Testing']);
    $cartProduct = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Kopi Susu Testing',
        'description' => null,
        'price' => 18000,
        'stock' => 10,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $recommendedProduct = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Croissant Testing',
        'description' => null,
        'price' => 22000,
        'stock' => 8,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);

    $mock = Mockery::mock(AiUpsellRecommendationService::class);
    $mock->shouldReceive('recommend')
        ->once()
        ->with([$cartProduct->id])
        ->andReturn([
            [
                'product_id' => $recommendedProduct->id,
                'reason' => 'Cocok disajikan dengan kopi susu.',
            ],
        ]);

    $this->app->instance(AiUpsellRecommendationService::class, $mock);

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs($user)
        ->postJson(route('api.pos.upsell-recommendations'), [
            'cart_product_ids' => [$cartProduct->id],
        ])
        ->assertOk()
        ->assertExactJson([
            'recommendations' => [
                [
                    'product_id' => $recommendedProduct->id,
                    'reason' => 'Cocok disajikan dengan kopi susu.',
                ],
            ],
        ]);
});

it('returns empty upsell recommendations for empty cart without calling service', function () {
    $mock = Mockery::mock(AiUpsellRecommendationService::class);
    $mock->shouldNotReceive('recommend');

    $this->app->instance(AiUpsellRecommendationService::class, $mock);

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create())
        ->postJson(route('api.pos.upsell-recommendations'), [
            'cart_product_ids' => [],
        ])
        ->assertOk()
        ->assertExactJson([
            'recommendations' => [],
        ]);
});

it('validates upsell recommendation input', function () {
    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create())
        ->postJson(route('api.pos.upsell-recommendations'), [
            'cart_product_ids' => ['bad-id'],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('cart_product_ids.0');
});
