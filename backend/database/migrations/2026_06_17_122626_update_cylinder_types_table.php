<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    Schema::table('cylinder_types', function (Blueprint $table) {

        if (!Schema::hasColumn('cylinder_types', 'price')) {
            $table->decimal('price', 10, 2)->nullable();
        }

    });
}

    public function down(): void
    {
        Schema::table('cylinder_types', function (Blueprint $table) {
            $table->dropColumn('price');
        });
    }
};