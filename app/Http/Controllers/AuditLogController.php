<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('audit-logs/index', [
            'logs' => AuditLog::query()
                ->with('user:id,name')
                ->latest()
                ->limit(200)
                ->get()
                ->map(fn (AuditLog $log): array => [
                    'id' => $log->id,
                    'event' => $log->event,
                    'user' => $log->user?->name ?? 'System',
                    'auditable_type' => class_basename((string) $log->auditable_type),
                    'auditable_id' => $log->auditable_id,
                    'created_at' => $log->created_at?->format('d M Y H:i'),
                ]),
        ]);
    }
}
