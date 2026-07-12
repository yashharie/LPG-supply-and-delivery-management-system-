<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RefundStatusChanged extends Notification
{
    use Queueable;

    public function __construct(
        public readonly array  $order,
        public readonly string $refundStatus, // 'Refund Pending' | 'Refunded'
        public readonly ?string $refundNotes = null,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $icon    = $this->refundStatus === 'Refunded' ? '💰' : '⏳';
        $title   = $this->refundStatus === 'Refunded'
            ? "{$icon} Refund Completed"
            : "{$icon} Refund Initiated";

        $message = $this->refundStatus === 'Refunded'
            ? "Your refund for order #{$this->order['order_number']} (LKR " . number_format($this->order['total_amount'], 2) . ") has been processed."
            : "Your order #{$this->order['order_number']} was cancelled. A refund of LKR " . number_format($this->order['total_amount'], 2) . " is being processed.";

        if ($this->refundNotes) {
            $message .= " Note: {$this->refundNotes}";
        }

        return [
            'type'          => 'refund_status',
            'title'         => $title,
            'message'       => $message,
            'order_id'      => $this->order['id'],
            'order_number'  => $this->order['order_number'],
            'refund_status' => $this->refundStatus,
        ];
    }
}
