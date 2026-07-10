<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockHistory extends Model
{
    protected $table = 'stock_histories';

    protected $fillable = [
        'warehouse_id',
        'cylinder_type_id',
        'order_id',
        'user_id',
        'trip_id',
        'type',
        'quantity',
        'note',
    ];

    public function warehouse()   { return $this->belongsTo(Warehouse::class); }
    public function cylinderType(){ return $this->belongsTo(CylinderType::class); }
    public function order()       { return $this->belongsTo(Order::class); }
    public function user()        { return $this->belongsTo(User::class); }
    public function trip()        { return $this->belongsTo(Trip::class); }
}
