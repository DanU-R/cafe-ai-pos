<?php

use App\Models\PosSetting;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('allows admin to view payment settings', function () {
    PosSetting::query()->create(['key' => 'qris_base_string', 'value' => 'ADMIN_QRIS_BASE']);
    $user = User::factory()->create(['role' => 'admin']);

    $this->actingAs($user)
        ->get(route('settings.payment.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/payment')
            ->where('settings.qris_base_string', 'ADMIN_QRIS_BASE'),
        );
});

it('allows admin to update payment settings', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $this->actingAs($user)
        ->post(route('settings.payment.update'), ['qris_base_string' => 'UPDATED_QRIS_BASE'])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(PosSetting::value('qris_base_string'))->toBe('UPDATED_QRIS_BASE');
});

it('forbids cashier from payment settings', function () {
    $user = User::factory()->create(['role' => 'cashier']);

    $this->actingAs($user)
        ->get(route('settings.payment.edit'))
        ->assertForbidden();

    $this->actingAs($user)
        ->post(route('settings.payment.update'), ['qris_base_string' => 'CASHIER_QRIS_BASE'])
        ->assertForbidden();
});

it('passes qris base string to pos page', function () {
    PosSetting::query()->create(['key' => 'qris_base_string', 'value' => 'POS_QRIS_BASE']);
    $user = User::factory()->create(['role' => 'cashier']);

    $this->actingAs($user)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pos/index')
            ->where('settings.qris_base_string', 'POS_QRIS_BASE'),
        );
});
