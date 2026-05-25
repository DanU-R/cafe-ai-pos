<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cashier_shifts', function (Blueprint $table): void {
            if (! Schema::hasColumn('cashier_shifts', 'expected_cash')) {
                $table->decimal('expected_cash', 12, 2)->default(0)->after('opening_cash');
            }

            if (! Schema::hasColumn('cashier_shifts', 'actual_cash')) {
                $table->decimal('actual_cash', 12, 2)->nullable()->after('expected_cash');
            }

            if (! Schema::hasColumn('cashier_shifts', 'expected_bca')) {
                $table->decimal('expected_bca', 12, 2)->default(0)->after('actual_cash');
            }

            if (! Schema::hasColumn('cashier_shifts', 'actual_bca')) {
                $table->decimal('actual_bca', 12, 2)->nullable()->after('expected_bca');
            }

            if (! Schema::hasColumn('cashier_shifts', 'expected_qris')) {
                $table->decimal('expected_qris', 12, 2)->default(0)->after('actual_bca');
            }

            if (! Schema::hasColumn('cashier_shifts', 'actual_qris')) {
                $table->decimal('actual_qris', 12, 2)->nullable()->after('expected_qris');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cashier_shifts', function (Blueprint $table): void {
            foreach (['actual_qris', 'expected_qris', 'actual_bca', 'expected_bca'] as $column) {
                if (Schema::hasColumn('cashier_shifts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
