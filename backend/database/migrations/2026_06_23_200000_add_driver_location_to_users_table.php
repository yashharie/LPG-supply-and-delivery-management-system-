<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'driver_lat')) {
                $table->decimal('driver_lat', 10, 7)->nullable()->after('longitude');
            }
            if (!Schema::hasColumn('users', 'driver_lng')) {
                $table->decimal('driver_lng', 10, 7)->nullable()->after('driver_lat');
            }
            if (!Schema::hasColumn('users', 'driver_location_updated_at')) {
                $table->timestamp('driver_location_updated_at')->nullable()->after('driver_lng');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['driver_lat', 'driver_lng', 'driver_location_updated_at']);
        });
    }
};
