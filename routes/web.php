<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\MenuDescriptionController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('ai/menu-description', [MenuDescriptionController::class, 'edit'])
        ->name('menu-description.edit');
    Route::post('ai/menu-description', [MenuDescriptionController::class, 'store'])
        ->name('menu-description.store');
    Route::get('pos', [PosController::class, 'index'])->name('pos.index');
    Route::post('pos/checkout', [PosController::class, 'checkout'])->name('pos.checkout');
    Route::resource('categories', CategoryController::class)->except(['show']);
    Route::resource('products', ProductController::class)->except(['show']);
});

require __DIR__.'/settings.php';
