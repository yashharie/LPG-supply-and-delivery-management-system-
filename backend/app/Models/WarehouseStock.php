<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarehouseStock extends Model
{
    protected $table = 'warehouse_stocks';

    protected $fillable = [
        'warehouse_id',
        'cylinder_type_id',
        'quantity'
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function cylinderType()
    {
        return $this->belongsTo(CylinderType::class);
    }
}

