<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Brand;
use App\Models\CylinderType;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Admin ──────────────────────────────────────────────────
        User::firstOrCreate(
            ['employee_id' => 'ADM001'],
            [
                'name'        => 'GasHub Admin',
                'email'       => 'admin@gashub.lk',
                'nic'         => '199000000001',
                'password'    => Hash::make('Admin@123'),
                'role'        => 'admin',
                'status'      => true,
                'is_verified' => true,
            ]
        );

        // ── Brands ────────────────────────────────────────────────
        $litro  = Brand::firstOrCreate(['name' => 'Litro Gas']);
        $laugfs = Brand::firstOrCreate(['name' => 'Laugfs Gas']);

        // ── Cylinder Types ────────────────────────────────────────
        $types = [
            ['brand_id' => $litro->id,  'name' => 'Small Cylinder',  'weight' => 5,    'price' => 1450.00],
            ['brand_id' => $litro->id,  'name' => 'Medium Cylinder', 'weight' => 12.5, 'price' => 3625.00],
            ['brand_id' => $litro->id,  'name' => 'Large Cylinder',  'weight' => 37,   'price' => 10730.00],
            ['brand_id' => $laugfs->id, 'name' => 'Small Cylinder',  'weight' => 5,    'price' => 1430.00],
            ['brand_id' => $laugfs->id, 'name' => 'Medium Cylinder', 'weight' => 12.5, 'price' => 3600.00],
            ['brand_id' => $laugfs->id, 'name' => 'Large Cylinder',  'weight' => 37,   'price' => 10700.00],
        ];

        foreach ($types as $type) {
            CylinderType::firstOrCreate(
                ['brand_id' => $type['brand_id'], 'name' => $type['name']],
                ['weight' => $type['weight'], 'price' => $type['price']]
            );
        }

        $this->command->info('✅ Seeded: Admin user, Litro & Laugfs brands, 6 cylinder types.');
        $this->command->info('   Admin login → ID: ADM001  Password: Admin@123');
    }
}
