<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LowStockAlert extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $warehouseName,
        public readonly int    $warehouseId,
        public readonly int    $currentStock,
        public readonly int    $capacity,
        public readonly float  $usedPercent, // e.g. 30 means 30% used
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $remaining = $this->capacity - $this->currentStock;
        return [
            'type'           => 'low_stock',
            'title'          => '⚠️ Low Stock Alert',
            'message'        => "Warehouse \"{$this->warehouseName}\" has used {$this->usedPercent}% of capacity. Only {$remaining} cylinders remaining.",
            'warehouse_id'   => $this->warehouseId,
            'warehouse_name' => $this->warehouseName,
            'current_stock'  => $this->currentStock,
            'capacity'       => $this->capacity,
            'used_percent'   => $this->usedPercent,
        ];
    }
}
