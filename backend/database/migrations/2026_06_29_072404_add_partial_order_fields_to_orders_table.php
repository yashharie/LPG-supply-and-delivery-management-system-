<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->integer('pending_quantity')->default(0);
            $table->boolean('auto_reserve')->default(false);
            $table->string('partial_status')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['pending_quantity', 'auto_reserve', 'partial_status']);
        });
    }
};
