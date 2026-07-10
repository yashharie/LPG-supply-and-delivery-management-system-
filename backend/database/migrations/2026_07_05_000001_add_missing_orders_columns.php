<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'warehouse_id'))
                $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            if (!Schema::hasColumn('orders', 'total_quantity'))
                $table->integer('total_quantity')->default(0);
            if (!Schema::hasColumn('orders', 'total_empty_returns'))
                $table->integer('total_empty_returns')->default(0);
            if (!Schema::hasColumn('orders', 'items_summary'))
                $table->text('items_summary')->nullable();
            if (!Schema::hasColumn('orders', 'receipt_path'))
                $table->string('receipt_path')->nullable();
            if (!Schema::hasColumn('orders', 'payment_receipt'))
                $table->string('payment_receipt')->nullable();
            if (!Schema::hasColumn('orders', 'assigned_driver_id'))
                $table->unsignedBigInteger('assigned_driver_id')->nullable();
            if (!Schema::hasColumn('orders', 'delivered_quantity'))
                $table->integer('delivered_quantity')->default(0);
            if (!Schema::hasColumn('orders', 'pending_quantity'))
                $table->integer('pending_quantity')->default(0);
            if (!Schema::hasColumn('orders', 'auto_reserve'))
                $table->boolean('auto_reserve')->default(false);
            if (!Schema::hasColumn('orders', 'partial_status'))
                $table->string('partial_status')->nullable();
            if (!Schema::hasColumn('orders', 'order_type'))
                $table->string('order_type')->default('NORMAL');
            if (!Schema::hasColumn('orders', 'requested_quantity'))
                $table->integer('requested_quantity')->nullable();
            if (!Schema::hasColumn('orders', 'remaining_quantity'))
                $table->integer('remaining_quantity')->default(0);
            if (!Schema::hasColumn('orders', 'is_split_order'))
                $table->boolean('is_split_order')->default(false);
            if (!Schema::hasColumn('orders', 'parent_order_id'))
                $table->unsignedBigInteger('parent_order_id')->nullable();
            if (!Schema::hasColumn('orders', 'trip_id'))
                $table->foreignId('trip_id')->nullable()->constrained('trips')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'warehouse_id', 'total_quantity', 'total_empty_returns',
                'items_summary', 'receipt_path', 'payment_receipt',
                'assigned_driver_id', 'delivered_quantity', 'pending_quantity',
                'auto_reserve', 'partial_status', 'order_type',
                'requested_quantity', 'remaining_quantity',
                'is_split_order', 'parent_order_id', 'trip_id',
            ]);
        });
    }
};
