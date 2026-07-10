<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'employee_id',
        'name',
        'email',
        'nic',
        'password',
        'role',
        'must_change_password',
        'status',
        'warehouse_id',
        'phone',
        'address',
        'latitude',
        'longitude',
        'driver_lat',
        'driver_lng',
        'driver_location_updated_at',
        'driver_max_capacity',
        'driver_current_load',
        'otp',
        'otp_expires_at',
        'otp_attempts',
        'is_verified',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'          => 'datetime',
            'otp_expires_at'             => 'datetime',
            'driver_location_updated_at' => 'datetime',
            'password'                   => 'hashed',
            'must_change_password'       => 'boolean',
            'status'                     => 'boolean',
            'is_verified'                => 'boolean',
            'latitude'                   => 'float',
            'longitude'                  => 'float',
            'driver_lat'                 => 'float',
            'driver_lng'                 => 'float',
        ];
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
