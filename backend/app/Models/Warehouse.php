<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    protected $fillable = [
        'name',
        'address',
        'latitude',
        'longitude',
        'capacity',
        'current_stock',
        'status',
    ];

    protected $casts = [
        'latitude'      => 'float',
        'longitude'     => 'float',
        'capacity'      => 'integer',
        'current_stock' => 'integer',
        'status'        => 'boolean',
    ];

    public function stocks()
    {
        return $this->hasMany(WarehouseStock::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
