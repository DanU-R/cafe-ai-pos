<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductModifier;
use App\Models\User;
use App\Services\AiCartParserService;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;

it('parses a natural language pos command through the mocked service', function () {
    $user = User::factory()->create();
    $category = Category::query()->create(['name' => 'AI POS Testing']);
    $product = Product::query()->create([
        'category_id' => $category->id,
        'name' => 'Kopi Susu Testing',
        'description' => null,
        'price' => 18000,
        'stock' => 10,
        'minimum_stock' => 1,
        'is_active' => true,
    ]);
    $modifier = ProductModifier::query()->create([
        'product_id' => $product->id,
        'name' => 'Extra Shot Testing',
        'price' => 5000,
        'is_active' => true,
    ]);

    $mock = Mockery::mock(AiCartParserService::class);
    $mock->shouldReceive('parse')
        ->once()
        ->with('dua kopi susu extra shot')
        ->andReturn([
            [
                'product_id' => $product->id,
                'quantity' => 2,
                'modifier_ids' => [$modifier->id],
            ],
        ]);

    $this->app->instance(AiCartParserService::class, $mock);

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs($user)
        ->postJson(route('api.pos.parse-natural-language'), [
            'command' => 'dua kopi susu extra shot',
        ])
        ->assertOk()
        ->assertExactJson([
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'modifier_ids' => [$modifier->id],
                ],
            ],
        ]);
});

it('validates natural language pos command input', function () {
    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create())
        ->postJson(route('api.pos.parse-natural-language'), [
            'command' => '',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrorFor('command');
});

it('returns a safe error when pos command parsing fails', function () {
    $mock = Mockery::mock(AiCartParserService::class);
    $mock->shouldReceive('parse')
        ->once()
        ->andThrow(new InvalidArgumentException('Invalid AI payload.'));

    $this->app->instance(AiCartParserService::class, $mock);

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs(User::factory()->create())
        ->postJson(route('api.pos.parse-natural-language'), [
            'command' => 'menu tidak jelas',
        ])
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'Perintah belum bisa dipahami. Coba tulis ulang dengan nama menu yang tersedia.',
        ]);
});
