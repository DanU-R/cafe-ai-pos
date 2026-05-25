<?php

use App\Http\Controllers\AiInventoryController;
use App\Http\Controllers\AiPosCommandController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CashDrawerMovementController;
use App\Http\Controllers\CashierShiftController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiningTableController;
use App\Http\Controllers\KitchenDisplayController;
use App\Http\Controllers\LowStockReportController;
use App\Http\Controllers\ManagerPinApprovalController;
use App\Http\Controllers\MenuDescriptionController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderRefundController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\PosSettingController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductStockController;
use App\Http\Controllers\ProfitReportController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\RawMaterialController;
use App\Http\Controllers\RawMaterialPurchaseController;
use App\Http\Controllers\RefundReportController;
use App\Http\Controllers\SalesReportController;
use App\Http\Controllers\StockMovementReportController;
use App\Http\Controllers\StockOpnameController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\WastageController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('login'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('pos', [PosController::class, 'index'])->name('pos.index');
    Route::post('pos/checkout', [PosController::class, 'checkout'])->name('pos.checkout');
    Route::post('api/pos/parse-natural-language', [AiPosCommandController::class, 'store'])->name('api.pos.parse-natural-language');
    Route::post('api/pos/upsell-recommendations', [AiPosCommandController::class, 'upsell'])->name('api.pos.upsell-recommendations');
    Route::post('manager-pin/approve', [ManagerPinApprovalController::class, 'store'])->name('manager-pin.approve');
    Route::get('cashier-shifts', [CashierShiftController::class, 'index'])->name('cashier-shifts.index');
    Route::post('cashier-shifts', [CashierShiftController::class, 'store'])->name('cashier-shifts.store');
    Route::patch('cashier-shifts/{cashierShift}', [CashierShiftController::class, 'update'])->name('cashier-shifts.update');
    Route::post('cash-drawer-movements', [CashDrawerMovementController::class, 'store'])->name('cash-drawer-movements.store');
    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::patch('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
    Route::patch('orders/{order}/move-table', [OrderController::class, 'moveTable'])->name('orders.move-table');
    Route::post('orders/{order}/split-bill', [OrderController::class, 'splitBill'])->name('orders.split-bill');
    Route::post('orders/{order}/refunds', [OrderRefundController::class, 'store'])->name('orders.refunds.store');
    Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::get('kitchen', [KitchenDisplayController::class, 'index'])->name('kitchen.index');
    Route::patch('kitchen/orders/{order}', [KitchenDisplayController::class, 'update'])->name('kitchen.orders.update');

    Route::middleware('admin')->group(function () {
        Route::get('api/inventory/predictive-restock', [AiInventoryController::class, 'predictiveRestock'])
            ->name('api.inventory.predictive-restock');
        Route::get('ai/menu-description', [MenuDescriptionController::class, 'edit'])
            ->name('menu-description.edit');
        Route::post('ai/menu-description', [MenuDescriptionController::class, 'store'])
            ->name('menu-description.store');
        Route::resource('categories', CategoryController::class)->except(['show']);
        Route::resource('dining-tables', DiningTableController::class)->except(['show']);
        Route::post('products/{product}/stock', [ProductStockController::class, 'store'])->name('products.stock.store');
        Route::resource('products', ProductController::class)->except(['show']);
        Route::resource('suppliers', SupplierController::class)->except(['show']);
        Route::resource('purchases', PurchaseController::class)->only(['index', 'create', 'store']);
        Route::resource('users', UserManagementController::class)->except(['show', 'destroy']);
        Route::resource('customers', CustomerController::class)->except(['show', 'destroy']);
        Route::resource('promotions', PromotionController::class)->except(['show', 'destroy']);
        Route::get('pos-settings', [PosSettingController::class, 'edit'])->name('pos-settings.edit');
        Route::put('pos-settings', [PosSettingController::class, 'update'])->name('pos-settings.update');
        Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');
        Route::resource('raw-materials', RawMaterialController::class)->except(['show']);
        Route::get('wastage/create', [WastageController::class, 'create'])->name('wastage.create');
        Route::post('wastage', [WastageController::class, 'store'])->name('wastage.store');
        Route::resource('raw-material-purchases', RawMaterialPurchaseController::class)->only(['index', 'create', 'store']);
        Route::resource('stock-opnames', StockOpnameController::class)->only(['index', 'create', 'store']);
        Route::post('stock-opnames/{stockOpname}/approve', [StockOpnameController::class, 'approve'])->name('stock-opnames.approve');
        Route::get('reports/sales', SalesReportController::class)->name('reports.sales');
        Route::get('reports/profit', ProfitReportController::class)->name('reports.profit');
        Route::get('reports/refunds', RefundReportController::class)->name('reports.refunds');
        Route::get('reports/low-stock', [LowStockReportController::class, 'index'])->name('reports.low-stock.index');
        Route::get('reports/low-stock/export', [LowStockReportController::class, 'export'])->name('reports.low-stock.export');
        Route::get('reports/stock-movements', [StockMovementReportController::class, 'index'])->name('reports.stock-movements.index');
        Route::get('reports/stock-movements/export', [StockMovementReportController::class, 'export'])->name('reports.stock-movements.export');
    });
});

require __DIR__.'/settings.php';
