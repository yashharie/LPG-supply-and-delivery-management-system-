<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderPlaced extends Notification
{
    use Queueable;

    public function __construct(
        public readonly array $order,   // ['id', 'order_number', 'total_quantity', 'total_amount']
        public readonly string $clientName,
        public readonly string $warehouseName,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'type'           => 'order_placed',
            'title'          => '📦 New Order Received',
            'message'        => "Order #{$this->order['order_number']} placed by {$this->clientName} — {$this->order['total_quantity']} cylinders.",
            'order_id'       => $this->order['id'],
            'order_number'   => $this->order['order_number'],
            'client_name'    => $this->clientName,
            'warehouse_name' => $this->warehouseName,
            'amount'         => $this->order['total_amount'],
        ];
    }
}
