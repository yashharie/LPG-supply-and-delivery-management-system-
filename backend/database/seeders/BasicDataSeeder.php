<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Brand;
use App\Models\CylinderType;
use App\Models\Warehouse;

class BasicDataSeeder extends Seeder
{
    public function run(): void
    {
        /* ── BRANDS ── */
        $litro  = Brand::firstOrCreate(['name' => 'Litro']);
        $laugfs = Brand::firstOrCreate(['name' => 'Laugfs']);

        /* ── CYLINDER TYPES ── */
        $types = [
            ['brand_id' => $litro->id,  'name' => 'Small Cylinder',  'weight' => 5,  'price' => 1500],
            ['brand_id' => $litro->id,  'name' => 'Medium Cylinder', 'weight' => 12, 'price' => 3500],
            ['brand_id' => $litro->id,  'name' => 'Large Cylinder',  'weight' => 37, 'price' => 7000],
            ['brand_id' => $laugfs->id, 'name' => 'Small Cylinder',  'weight' => 5,  'price' => 1450],
            ['brand_id' => $laugfs->id, 'name' => 'Medium Cylinder', 'weight' => 12, 'price' => 3400],
            ['brand_id' => $laugfs->id, 'name' => 'Large Cylinder',  'weight' => 37, 'price' => 6800],
        ];

        foreach ($types as $type) {
            CylinderType::firstOrCreate(
                ['brand_id' => $type['brand_id'], 'name' => $type['name']],
                ['weight' => $type['weight'], 'price' => $type['price']]
            );
        }

        /* ── WAREHOUSE ── */
        Warehouse::firstOrCreate(
            ['name' => 'Colombo Central Depot'],
            [
                'address'       => 'No. 100, Galle Road, Colombo 03',
                'latitude'      => 6.9271,
                'longitude'     => 79.8612,
                'capacity'      => 2000,
                'current_stock' => 0,
                'status'        => true,
            ]
        );

        Warehouse::firstOrCreate(
            ['name' => 'Kandy Regional Hub'],
            [
                'address'       => 'Peradeniya Road, Kandy',
                'latitude'      => 7.2906,
                'longitude'     => 80.6337,
                'capacity'      => 1500,
                'current_stock' => 0,
                'status'        => true,
            ]
        );

        /* ── ADMIN USER ── */
        User::updateOrCreate(
            ['employee_id' => 'ADM001'],
            [
                'name'                 => 'GasHub Admin',
                'email'                => 'admin@gashub.system',
                'nic'                  => '999999999V',
                'password'             => Hash::make('admin123'),
                'role'                 => 'admin',
                'must_change_password' => false,
                'status'               => true,
            ]
        );
    }
}
