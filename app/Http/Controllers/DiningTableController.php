<?php

namespace App\Http\Controllers;

use App\Models\DiningTable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DiningTableController extends Controller
{
    /**
     * Display a listing of dining tables.
     */
    public function index(): Response
    {
        return Inertia::render('dining-tables/index', [
            'tables' => DiningTable::query()
                ->orderBy('name')
                ->get(['id', 'name', 'capacity', 'status', 'is_active', 'created_at']),
        ]);
    }

    /**
     * Show the form for creating a new dining table.
     */
    public function create(): Response
    {
        return Inertia::render('dining-tables/form');
    }

    /**
     * Store a newly created dining table in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        DiningTable::create($this->validated($request));

        return to_route('dining-tables.index');
    }

    /**
     * Show the form for editing the specified dining table.
     */
    public function edit(DiningTable $diningTable): Response
    {
        return Inertia::render('dining-tables/form', [
            'table' => $diningTable->only(['id', 'name', 'capacity', 'status', 'is_active']),
        ]);
    }

    /**
     * Update the specified dining table in storage.
     */
    public function update(Request $request, DiningTable $diningTable): RedirectResponse
    {
        $diningTable->update($this->validated($request, $diningTable));

        return to_route('dining-tables.index');
    }

    /**
     * Remove the specified dining table from storage.
     */
    public function destroy(DiningTable $diningTable): RedirectResponse
    {
        $diningTable->delete();

        return to_route('dining-tables.index');
    }

    /**
     * Validate dining table input.
     *
     * @return array{name: string, capacity: int, status: string, is_active: bool}
     */
    private function validated(Request $request, ?DiningTable $diningTable = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('dining_tables', 'name')->ignore($diningTable),
            ],
            'capacity' => ['required', 'integer', 'min:1', 'max:50'],
            'status' => ['required', 'string', Rule::in(['available', 'occupied', 'reserved'])],
            'is_active' => ['required', 'boolean'],
        ]);
    }
}
