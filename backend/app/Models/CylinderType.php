<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CylinderType extends Model
{
    protected $fillable = [
        'name',
        'weight',
        'price',
        'brand_id'
    ];

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }
}