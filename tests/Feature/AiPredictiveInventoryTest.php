<?php

use App\Models\User;
use App\Services\AiPredictiveInventoryService;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::forget('ai_inventory_predictive_restock');
});

it('returns mocked AI predictive inventory recommendations', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $mock = Mockery::mock(AiPredictiveInventoryService::class);
    $mock->shouldReceive('predict')
        ->once()
        ->andReturn([
            [
                'item_name' => 'Kopi Susu Botol',
                'predicted_days_left' => 2,
                'urgency' => 'High',
                'recommendation' => 'Restock hari ini minimal 20 pcs.',
            ],
        ]);

    $this->app->instance(AiPredictiveInventoryService::class, $mock);

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs($admin)
        ->getJson(route('api.inventory.predictive-restock'))
        ->assertOk()
        ->assertExactJson([
            'predictions' => [
                [
                    'item_name' => 'Kopi Susu Botol',
                    'predicted_days_left' => 2,
                    'urgency' => 'High',
                    'recommendation' => 'Restock hari ini minimal 20 pcs.',
                ],
            ],
        ]);
});

it('caches predictive inventory recommendations', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $mock = Mockery::mock(AiPredictiveInventoryService::class);
    $mock->shouldReceive('predict')
        ->once()
        ->andReturn([
            [
                'item_name' => 'Susu UHT',
                'predicted_days_left' => 3.5,
                'urgency' => 'Medium',
                'recommendation' => 'Pantau dan jadwalkan restock minggu ini.',
            ],
        ]);

    $this->app->instance(AiPredictiveInventoryService::class, $mock);

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs($admin)
        ->getJson(route('api.inventory.predictive-restock'))
        ->assertOk();

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs($admin)
        ->getJson(route('api.inventory.predictive-restock'))
        ->assertOk()
        ->assertExactJson([
            'predictions' => [
                [
                    'item_name' => 'Susu UHT',
                    'predicted_days_left' => 3.5,
                    'urgency' => 'Medium',
                    'recommendation' => 'Pantau dan jadwalkan restock minggu ini.',
                ],
            ],
        ]);
});

it('blocks non admin users from predictive inventory endpoint', function () {
    $cashier = User::factory()->create(['role' => 'cashier']);

    $mock = Mockery::mock(AiPredictiveInventoryService::class);
    $mock->shouldNotReceive('predict');

    $this->app->instance(AiPredictiveInventoryService::class, $mock);

    $this->withoutMiddleware([EnsureEmailIsVerified::class])
        ->actingAs($cashier)
        ->getJson(route('api.inventory.predictive-restock'))
        ->assertForbidden();
});
