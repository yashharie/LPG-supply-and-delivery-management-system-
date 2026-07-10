<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TripOrder extends Model
{
    protected $table = 'trip_orders';

    protected $fillable = [
        'trip_id', 'order_id',
        'accepted_quantity', 'delivered_quantity', 'status',
        'delivered_items',
    ];

    protected $casts = [
        'delivered_items' => 'array',
    ];

    public function trip()  { return $this->belongsTo(Trip::class);  }
    public function order() { return $this->belongsTo(Order::class); }
}
