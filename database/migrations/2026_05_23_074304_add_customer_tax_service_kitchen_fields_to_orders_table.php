<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('cashier_shift_id')->constrained()->nullOnDelete();
            $table->decimal('tax_amount', 12, 2)->default(0)->after('discount_amount');
            $table->decimal('service_charge_amount', 12, 2)->default(0)->after('tax_amount');
            $table->string('kitchen_status')->default('queued')->after('status')->index();
            $table->timestamp('kitchen_completed_at')->nullable()->after('kitchen_status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
            $table->dropColumn(['tax_amount', 'service_charge_amount', 'kitchen_status', 'kitchen_completed_at']);
        });
    }
};
