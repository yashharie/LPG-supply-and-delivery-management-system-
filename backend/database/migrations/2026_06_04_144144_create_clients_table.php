<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
   public function up(): void
{
    Schema::create('clients', function (Blueprint $table) {

        $table->id();

        $table->string('company_name');

        $table->string('business_reg_no')->unique();

        $table->string('contact_person');

        $table->string('email')->unique();

        $table->string('phone');

        $table->text('address');

        $table->decimal('latitude', 10, 7)->nullable();
        $table->decimal('longitude', 10, 7)->nullable();

        $table->string('password');

        $table->enum('status', [
            'pending',
            'approved',
            'rejected'
        ])->default('pending');

        $table->rememberToken();

        $table->timestamps();
    });
}


    public function down(): void
{
    Schema::dropIfExists('clients');
}

};
