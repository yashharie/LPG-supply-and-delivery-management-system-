<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $table = 'feedbacks';

    protected $fillable = [
        'user_id', 'type', 'subject', 'message',
        'email', 'name', 'status', 'admin_reply',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
