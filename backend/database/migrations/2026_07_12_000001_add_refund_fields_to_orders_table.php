<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Payment status: Pending | Verified | Refund Pending | Refunded
            $table->string('payment_status')->default('Pending')->after('status');

            // Cancellation
            $table->text('cancellation_reason')->nullable()->after('payment_status');
            $table->timestamp('cancelled_at')->nullable()->after('cancellation_reason');

            // Refund tracking
            $table->foreignId('refunded_by')->nullable()->constrained('users')->nullOnDelete()->after('cancelled_at');
            $table->timestamp('refunded_at')->nullable()->after('refunded_by');
            $table->text('refund_notes')->nullable()->after('refunded_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['refunded_by']);
            $table->dropColumn([
                'payment_status',
                'cancellation_reason',
                'cancelled_at',
                'refunded_by',
                'refunded_at',
                'refund_notes',
            ]);
        });
    }
};
