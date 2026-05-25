<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('customers/index', [
            'customers' => Customer::query()
                ->latest()
                ->get(['id', 'name', 'phone', 'email', 'points', 'is_active']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('customers/form');
    }

    public function store(Request $request): RedirectResponse
    {
        $customer = Customer::query()->create($this->validated($request));

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'customer.created',
            'auditable_type' => Customer::class,
            'auditable_id' => $customer->id,
            'new_values' => $customer->only(['name', 'phone', 'email']),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return to_route('customers.index')->with('success', 'Customer berhasil ditambahkan.');
    }

    public function edit(Customer $customer): Response
    {
        return Inertia::render('customers/form', [
            'customer' => $customer->only(['id', 'name', 'phone', 'email', 'points', 'is_active', 'note']),
        ]);
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $oldValues = $customer->only(['name', 'phone', 'email', 'points', 'is_active', 'note']);
        $customer->update($this->validated($request, $customer));

        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event' => 'customer.updated',
            'auditable_type' => Customer::class,
            'auditable_id' => $customer->id,
            'old_values' => $oldValues,
            'new_values' => $customer->only(['name', 'phone', 'email', 'points', 'is_active', 'note']),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
        ]);

        return to_route('customers.index')->with('success', 'Customer berhasil diperbarui.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Customer $customer = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', Rule::unique('customers', 'phone')->ignore($customer)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('customers', 'email')->ignore($customer)],
            'points' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['boolean'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
