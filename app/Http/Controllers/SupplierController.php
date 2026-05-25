<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupplierController extends Controller
{
    /**
     * Display suppliers.
     */
    public function index(): Response
    {
        return Inertia::render('suppliers/index', [
            'suppliers' => Supplier::query()
                ->withCount('purchases')
                ->orderBy('name')
                ->get(['id', 'name', 'phone', 'email', 'address', 'is_active', 'created_at']),
        ]);
    }

    /**
     * Show create supplier form.
     */
    public function create(): Response
    {
        return Inertia::render('suppliers/form');
    }

    /**
     * Store supplier.
     */
    public function store(Request $request): RedirectResponse
    {
        Supplier::create($this->validated($request));

        return to_route('suppliers.index');
    }

    /**
     * Show edit supplier form.
     */
    public function edit(Supplier $supplier): Response
    {
        return Inertia::render('suppliers/form', [
            'supplier' => $supplier->only(['id', 'name', 'phone', 'email', 'address', 'is_active']),
        ]);
    }

    /**
     * Update supplier.
     */
    public function update(Request $request, Supplier $supplier): RedirectResponse
    {
        $supplier->update($this->validated($request));

        return to_route('suppliers.index');
    }

    /**
     * Delete supplier.
     */
    public function destroy(Supplier $supplier): RedirectResponse
    {
        $supplier->delete();

        return to_route('suppliers.index');
    }

    /**
     * Validate supplier data.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
