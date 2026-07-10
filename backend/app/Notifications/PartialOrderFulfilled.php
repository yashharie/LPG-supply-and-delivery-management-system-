<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PartialOrderFulfilled extends Notification
{
    use Queueable;

    public function __construct(
        public readonly array $order,
        public readonly int   $fulfilledQty,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'          => 'order_status',
            'title'         => '🎉 Reserved Order Fulfilled',
            'message'       => "Your reserved order #{$this->order['order_number']} has been fulfilled! "
                             . "{$this->fulfilledQty} cylinders are now ready for delivery.",
            'order_id'      => $this->order['id'],
            'order_number'  => $this->order['order_number'],
            'status'        => 'FULFILLED',
            'fulfilled_qty' => $this->fulfilledQty,
        ];
    }
}
