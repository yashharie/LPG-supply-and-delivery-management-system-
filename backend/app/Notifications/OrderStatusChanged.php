<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderStatusChanged extends Notification
{
    use Queueable;

    private static array $icons = [
        'Approved'           => '✅',
        'Rejected'           => '❌',
        'Out for Delivery'   => '🚚',
        'Partially Delivered'=> '📦',
        'Delivered'          => '🎉',
        'Cancelled'          => '🚫',
        'PARTIAL_CONFIRMED'  => '⏳',
        'COMPLETED_PARTIAL'  => '✂️',
        'FULFILLED'          => '🎉',
    ];

    public function __construct(
        public readonly array  $order,
        public readonly string $newStatus,
        public readonly string $warehouseName = '',
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $icon = self::$icons[$this->newStatus] ?? '🔔';
        $messages = [
            'Approved'            => "Your order #{$this->order['order_number']} has been approved.",
            'Rejected'            => "Your order #{$this->order['order_number']} was rejected.",
            'Out for Delivery'    => "Your order #{$this->order['order_number']} is on its way!",
            'Partially Delivered' => "Part of your order #{$this->order['order_number']} has been delivered. The driver will return with the rest.",
            'Delivered'           => "Your order #{$this->order['order_number']} has been delivered!",
            'Cancelled'           => "Order #{$this->order['order_number']} was cancelled.",
            'PARTIAL_CONFIRMED'   => "Order #{$this->order['order_number']}: available stock will be delivered now. Remaining quantity is reserved and will be sent when stock arrives.",
            'COMPLETED_PARTIAL'   => "Order #{$this->order['order_number']}: partial delivery confirmed. Only available quantity will be delivered.",
            'FULFILLED'           => "Great news! Your reserved order #{$this->order['order_number']} has been fulfilled and is ready for delivery.",
        ];

        return [
            'type'         => 'order_status',
            'title'        => "{$icon} Order {$this->newStatus}",
            'message'      => $messages[$this->newStatus] ?? "Order #{$this->order['order_number']} status: {$this->newStatus}.",
            'order_id'     => $this->order['id'],
            'order_number' => $this->order['order_number'],
            'status'       => $this->newStatus,
        ];
    }
}
