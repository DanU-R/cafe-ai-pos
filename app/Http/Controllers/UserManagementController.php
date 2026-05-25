<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    /**
     * Display managed users.
     */
    public function index(): Response
    {
        return Inertia::render('users/index', [
            'users' => User::query()
                ->latest()
                ->get(['id', 'name', 'email', 'role', 'created_at']),
        ]);
    }

    /**
     * Show user create form.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('users/form', [
            'canManageManagerPins' => $this->canManageManagerPins($request),
        ]);
    }

    /**
     * Store new user.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', 'string', Rule::in(['super_admin', 'admin', 'cashier'])],
            'password' => ['required', 'string', 'min:8'],
            'manager_pin' => ['nullable', 'string', 'digits_between:4,8'],
        ]);

        $attributes = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
        ];

        if ($this->canManageManagerPins($request) && ! empty($validated['manager_pin'])) {
            $attributes['manager_pin_hash'] = Hash::make($validated['manager_pin']);
        }

        User::create($attributes);

        return to_route('users.index');
    }

    /**
     * Show user edit form.
     */
    public function edit(Request $request, User $user): Response
    {
        return Inertia::render('users/form', [
            'managedUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'has_manager_pin' => $user->manager_pin_hash !== null,
            ],
            'canManageManagerPins' => $this->canManageManagerPins($request),
        ]);
    }

    /**
     * Update user.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'role' => ['required', 'string', Rule::in(['super_admin', 'admin', 'cashier'])],
            'password' => ['nullable', 'string', 'min:8'],
            'manager_pin' => ['nullable', 'string', 'digits_between:4,8'],
        ]);

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
        ]);

        if (! empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        if ($this->canManageManagerPins($request) && ! empty($validated['manager_pin'])) {
            $user->manager_pin_hash = Hash::make($validated['manager_pin']);
        }

        $user->save();

        return to_route('users.index');
    }

    private function canManageManagerPins(Request $request): bool
    {
        return $request->user()?->role === 'super_admin';
    }
}
