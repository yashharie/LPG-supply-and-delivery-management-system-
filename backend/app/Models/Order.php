<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'warehouse_id',
        'order_number',
        'total_quantity',
        'delivered_quantity',
        'total_empty_returns',
        'total_amount',
        'receipt_path',
        'payment_receipt',
        'status',
        'items_summary',
        'assigned_driver_id',
        'trip_id',
        'is_split_order',
        'parent_order_id',
        'pending_quantity',
        'auto_reserve',
        'partial_status',
        'order_type',
        'requested_quantity',
        'remaining_quantity',
        'delivery_otp',
        'delivery_otp_expires_at',
        'delivery_otp_verified',
        'batch_items',
        'temp_delivery_details',
    ];

    protected $casts = [
        'items_summary'           => 'array',
        'is_split_order'          => 'boolean',
        'auto_reserve'            => 'boolean',
        'delivery_otp_verified'   => 'boolean',
        'delivery_otp_expires_at' => 'datetime',
        'batch_items'             => 'array',
        'temp_delivery_details'   => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'assigned_driver_id');
    }

    public function trip()
    {
        return $this->belongsTo(Trip::class);
    }
}