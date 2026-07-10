<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Trips table ──────────────────────────────────────
        Schema::create('trips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('warehouse_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['pending', 'active', 'ended'])->default('pending');
            $table->integer('total_loaded')->default(0); // cylinders loaded at start
            $table->integer('total_delivered')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Trip-Order pivot ─────────────────────────────────
        Schema::create('trip_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trip_id')->constrained()->onDelete('cascade');
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->integer('accepted_quantity');   // what driver agreed to carry
            $table->integer('delivered_quantity')->default(0);
            $table->enum('status', ['pending', 'partial', 'delivered'])->default('pending');
            $table->timestamps();
        });

        // ── Add delivered_quantity to orders ─────────────────
        Schema::table('orders', function (Blueprint $table) {
            $table->integer('delivered_quantity')->default(0);
            $table->foreignId('trip_id')->nullable()->constrained()->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['trip_id']);
            $table->dropColumn(['delivered_quantity', 'trip_id']);
        });
        Schema::dropIfExists('trip_orders');
        Schema::dropIfExists('trips');
    }
};
