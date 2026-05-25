<?php

namespace App\Http\Controllers;

use App\Services\ManagerPinApprovalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManagerPinApprovalController extends Controller
{
    public function store(Request $request, ManagerPinApprovalService $approvals): JsonResponse
    {
        $validated = $request->validate([
            'manager_pin' => ['required', 'string', 'min:4', 'max:32'],
            'action' => ['required', 'string', 'max:100'],
        ]);

        $approver = $approvals->approve($request, $validated['action']);

        return response()->json([
            'approved' => true,
            'approver' => [
                'id' => $approver->id,
                'name' => $approver->name,
                'role' => $approver->role,
            ],
        ]);
    }
}
