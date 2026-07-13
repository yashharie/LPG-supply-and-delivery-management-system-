<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('refund_bank_name')->nullable()->after('refund_notes');
            $table->string('refund_bank_branch')->nullable()->after('refund_bank_name');
            $table->string('refund_account_number')->nullable()->after('refund_bank_branch');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['refund_bank_name', 'refund_bank_branch', 'refund_account_number']);
        });
    }
};
