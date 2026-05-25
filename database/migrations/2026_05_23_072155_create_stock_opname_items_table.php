<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_opname_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_opname_id')->constrained()->cascadeOnDelete();
            $table->nullableMorphs('stockable');
            $table->string('stockable_name');
            $table->string('unit')->nullable();
            $table->decimal('system_stock', 12, 3)->default(0);
            $table->decimal('counted_stock', 12, 3)->default(0);
            $table->decimal('difference', 12, 3)->default(0);
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_opname_items');
    }
};
