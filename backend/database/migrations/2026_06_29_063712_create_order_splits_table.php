<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_splits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('parent_order_id');  // main order
            $table->unsignedBigInteger('child_order_id');   // split child order
            $table->unsignedBigInteger('warehouse_id');
            $table->integer('quantity');                    // qty from this warehouse
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_splits');
    }
};
