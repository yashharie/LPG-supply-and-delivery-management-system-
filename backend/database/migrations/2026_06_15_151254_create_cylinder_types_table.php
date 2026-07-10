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
        Schema::create('cylinder_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')->constrained()->onDelete('cascade');
            $table->string('name'); // 5kg, 12.5kg, etc
            $table->integer('weight'); // kg
            $table->decimal('price', 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cylinder_types');
    }
};
