<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Max cylinders a driver can carry per trip
            $table->integer('driver_max_capacity')->default(1000);
            $table->integer('driver_current_load')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['driver_max_capacity', 'driver_current_load']);
        });
    }
};
