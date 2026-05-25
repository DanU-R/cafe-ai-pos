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
        Schema::table('promotions', function (Blueprint $table) {
            $table->string('promo_type')->default('global')->after('type')->index();
            $table->unsignedBigInteger('target_id')->nullable()->after('promo_type')->index();
            $table->time('start_time')->nullable()->after('ends_at');
            $table->time('end_time')->nullable()->after('start_time');
            $table->json('active_days')->nullable()->after('end_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropColumn(['promo_type', 'target_id', 'start_time', 'end_time', 'active_days']);
        });
    }
};
