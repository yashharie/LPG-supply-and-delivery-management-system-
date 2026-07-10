<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'delivery_otp'))
                $table->string('delivery_otp', 6)->nullable();
            if (!Schema::hasColumn('orders', 'delivery_otp_expires_at'))
                $table->timestamp('delivery_otp_expires_at')->nullable();
            if (!Schema::hasColumn('orders', 'delivery_otp_verified'))
                $table->boolean('delivery_otp_verified')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_otp', 'delivery_otp_expires_at', 'delivery_otp_verified']);
        });
    }
};
