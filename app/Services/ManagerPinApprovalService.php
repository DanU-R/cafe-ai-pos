<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ManagerPinApprovalService
{
    public function approve(Request $request, string $action, mixed $auditable = null): User
    {
        $pin = (string) $request->input('manager_pin', '');

        if ($pin === '') {
            throw ValidationException::withMessages([
                'manager_pin' => 'PIN manager wajib diisi untuk aksi sensitif.',
            ]);
        }

        $approver = User::query()
            ->whereIn('role', ['admin', 'manager'])
            ->whereNotNull('manager_pin_hash')
            ->get()
            ->first(fn (User $user): bool => Hash::check($pin, (string) $user->manager_pin_hash));

        if (! $approver) {
            throw ValidationException::withMessages([
                'manager_pin' => 'PIN manager tidak valid.',
            ]);
        }

        $this->audit($request, $action, $approver, $auditable);

        return $approver;
    }

    private function audit(Request $request, string $action, User $approver, mixed $auditable = null): void
    {
        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'manager_pin.approved',
            'auditable_type' => is_object($auditable) ? $auditable::class : null,
            'auditable_id' => is_object($auditable) && method_exists($auditable, 'getKey') ? $auditable->getKey() : null,
            'new_values' => [
                'action' => $action,
                'approver_id' => $approver->id,
                'approver_role' => $approver->role,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
