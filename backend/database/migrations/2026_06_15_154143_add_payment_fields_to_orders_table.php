<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            // Add only if not already exists (safe for dev mistakes)
            if (!Schema::hasColumn('orders', 'payment_receipt')) {
                $table->string('payment_receipt')->nullable();
            }

            if (!Schema::hasColumn('orders', 'status')) {
                $table->string('status')->default('pending');
            }

            if (!Schema::hasColumn('orders', 'assigned_driver_id')) {
                $table->unsignedBigInteger('assigned_driver_id')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            if (Schema::hasColumn('orders', 'payment_receipt')) {
                $table->dropColumn('payment_receipt');
            }

            if (Schema::hasColumn('orders', 'status')) {
                $table->dropColumn('status');
            }

            if (Schema::hasColumn('orders', 'assigned_driver_id')) {
                $table->dropColumn('assigned_driver_id');
            }
        });
    }
};