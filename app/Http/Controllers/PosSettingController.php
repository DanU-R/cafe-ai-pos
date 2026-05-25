<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\PosSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosSettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('pos-settings/form', [
            'settings' => [
                'tax_percent' => PosSetting::value('tax_percent', '0'),
                'service_charge_percent' => PosSetting::value('service_charge_percent', '0'),
                'receipt_footer' => PosSetting::value('receipt_footer', 'Terima kasih.'),
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tax_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'service_charge_percent' => ['required', 'numeric', 'min:0', 'max:100'],
            'receipt_footer' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($validated as $key => $value) {
            PosSetting::query()->updateOrCreate(['key' => $key], ['value' => (string) $value]);
        }

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'pos_settings.updated',
            'new_values' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return back()->with('success', 'Setting POS berhasil disimpan.');
    }
}
