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
            if (!Schema::hasColumn('orders', 'batch_items')) {
                $table->json('batch_items')->nullable();
            }
            if (!Schema::hasColumn('orders', 'temp_delivery_details')) {
                $table->json('temp_delivery_details')->nullable();
            }
        });

        Schema::table('trips', function (Blueprint $table) {
            if (!Schema::hasColumn('trips', 'loaded_items')) {
                $table->json('loaded_items')->nullable();
            }
        });

        Schema::table('trip_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('trip_orders', 'delivered_items')) {
                $table->json('delivered_items')->nullable();
            }
        });

        Schema::table('stock_histories', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_histories', 'trip_id')) {
                $table->foreignId('trip_id')->nullable()->constrained('trips')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_histories', function (Blueprint $table) {
            if (Schema::hasColumn('stock_histories', 'trip_id')) {
                $table->dropForeign(['trip_id']);
                $table->dropColumn('trip_id');
            }
        });

        Schema::table('trip_orders', function (Blueprint $table) {
            if (Schema::hasColumn('trip_orders', 'delivered_items')) {
                $table->dropColumn('delivered_items');
            }
        });

        Schema::table('trips', function (Blueprint $table) {
            if (Schema::hasColumn('trips', 'loaded_items')) {
                $table->dropColumn('loaded_items');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'batch_items')) {
                $table->dropColumn('batch_items');
            }
            if (Schema::hasColumn('orders', 'temp_delivery_details')) {
                $table->dropColumn('temp_delivery_details');
            }
        });
    }
};
