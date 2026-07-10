<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('type', ['feedback', 'complaint', 'issue']);
            $table->string('subject');
            $table->text('message');
            $table->string('email')->nullable();   // for guests
            $table->string('name')->nullable();    // for guests
            $table->enum('status', ['open', 'reviewed', 'resolved'])->default('open');
            $table->text('admin_reply')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedbacks');
    }
};
