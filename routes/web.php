<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\MenuDescriptionController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('ai/menu-description', [MenuDescriptionController::class, 'edit'])
        ->name('menu-description.edit');
    Route::post('ai/menu-description', [MenuDescriptionController::class, 'store'])
        ->name('menu-description.store');
    Route::resource('categories', CategoryController::class)->except(['show']);
    Route::resource('products', ProductController::class)->except(['show']);
});

require __DIR__.'/settings.php';
