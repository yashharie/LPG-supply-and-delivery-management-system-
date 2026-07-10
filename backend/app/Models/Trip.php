<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Trip extends Model
{
    protected $fillable = [
        'driver_id', 'warehouse_id', 'status',
        'total_loaded', 'total_delivered',
        'started_at', 'ended_at', 'notes',
        'loaded_items',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at'   => 'datetime',
        'loaded_items' => 'array',
    ];

    public function driver()    { return $this->belongsTo(User::class,      'driver_id'); }
    public function warehouse() { return $this->belongsTo(Warehouse::class); }
    public function orders()    { return $this->belongsToMany(Order::class,  'trip_orders')
                                         ->withPivot('accepted_quantity', 'delivered_quantity', 'status')
                                         ->withTimestamps(); }
    public function tripOrders(){ return $this->hasMany(TripOrder::class); }
}
