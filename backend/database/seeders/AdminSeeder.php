<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'name' => 'System Admin',
            'employee_id' => 'ADM0001',
            'email' => 'admin@gashub.com',
            'password' => Hash::make('Admin@123'),
            'role' => 'admin',
            'must_change_password' => false,
            'status' => true,
        ]);
    }
}