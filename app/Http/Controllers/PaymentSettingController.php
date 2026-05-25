<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\PosSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentSettingController extends Controller
{
    private const DEFAULT_QRIS_BASE_STRING = 'ISI_STRING_QRIS_STATIS_DEFAULT_DISINI';

    public function edit(): Response
    {
        return Inertia::render('settings/payment', [
            'settings' => [
                'qris_base_string' => PosSetting::value('qris_base_string', self::DEFAULT_QRIS_BASE_STRING),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'qris_base_string' => ['required', 'string', 'max:10000'],
        ]);

        PosSetting::query()->updateOrCreate(
            ['key' => 'qris_base_string'],
            ['value' => $validated['qris_base_string']],
        );

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'payment_settings.updated',
            'new_values' => ['qris_base_string' => $validated['qris_base_string']],
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return back()->with('success', 'Pengaturan pembayaran berhasil disimpan.');
    }
}
