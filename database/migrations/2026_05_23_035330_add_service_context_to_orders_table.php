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
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('dining_table_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('cashier_shift_id')->nullable()->after('dining_table_id')->constrained()->nullOnDelete();
            $table->string('service_type')->default('takeaway')->after('cashier_shift_id');
            $table->string('customer_name')->nullable()->after('service_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cashier_shift_id');
            $table->dropConstrainedForeignId('dining_table_id');
            $table->dropColumn(['service_type', 'customer_name']);
        });
    }
};
