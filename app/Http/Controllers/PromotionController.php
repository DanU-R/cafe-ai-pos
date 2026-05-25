<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Promotion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PromotionController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('promotions/index', [
            'promotions' => Promotion::query()->latest()->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('promotions/form');
    }

    public function store(Request $request): RedirectResponse
    {
        $promotion = Promotion::create($this->validated($request));

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'promotion.created',
            'auditable_type' => Promotion::class,
            'auditable_id' => $promotion->id,
            'new_values' => $promotion->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return to_route('promotions.index')->with('success', 'Promo berhasil ditambahkan.');
    }

    public function edit(Promotion $promotion): Response
    {
        return Inertia::render('promotions/form', [
            'promotion' => $promotion,
        ]);
    }

    public function update(Request $request, Promotion $promotion): RedirectResponse
    {
        $oldValues = $promotion->toArray();
        $promotion->update($this->validated($request, $promotion));

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'promotion.updated',
            'auditable_type' => Promotion::class,
            'auditable_id' => $promotion->id,
            'old_values' => $oldValues,
            'new_values' => $promotion->fresh()?->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return to_route('promotions.index')->with('success', 'Promo berhasil diperbarui.');
    }

    private function validated(Request $request, ?Promotion $promotion = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50', Rule::unique('promotions')->ignore($promotion)],
            'type' => ['required', Rule::in(['fixed', 'percent'])],
            'promo_type' => ['required', Rule::in(['global', 'product_specific', 'category_specific', 'bogo', 'happy_hour'])],
            'target_id' => ['nullable', 'integer', 'min:1'],
            'value' => ['required', 'numeric', 'min:0'],
            'minimum_spend' => ['nullable', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'active_days' => ['nullable', 'array'],
            'active_days.*' => ['string', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'is_active' => ['boolean'],
        ]);
    }
}
