<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use App\Models\User;
use App\Notifications\LowStockAlert;
use App\Notifications\PartialOrderFulfilled;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StockAlertService
{
    /**
     * Check if a warehouse stock has dropped below 75% remaining.
     * Also triggers auto-fulfillment of pending reserved orders.
     */
    public static function checkAfterDeduction(int $warehouseId): void
    {
        $warehouse = Warehouse::find($warehouseId);
        if (!$warehouse || $warehouse->capacity <= 0) return;

        $currentStock = WarehouseStock::where('warehouse_id', $warehouseId)->sum('quantity');
        $usedPercent  = round((1 - ($currentStock / $warehouse->capacity)) * 100, 1);

        if ($usedPercent <= 25) return;

        $notification = new LowStockAlert(
            warehouseName: $warehouse->name,
            warehouseId:   $warehouse->id,
            currentStock:  $currentStock,
            capacity:      $warehouse->capacity,
            usedPercent:   $usedPercent,
        );

        $admins = User::where('role', 'admin')->where('status', true)->get();
        foreach ($admins as $admin) {
            $alreadyNotified = $admin->unreadNotifications()
                ->where('data->type', 'low_stock')
                ->where('data->warehouse_id', $warehouse->id)
                ->exists();
            if (!$alreadyNotified) {
                $admin->notify($notification);
            }
        }

        $managers = User::where('role', 'manager')
            ->where('warehouse_id', $warehouseId)
            ->where('status', true)
            ->get();

        foreach ($managers as $manager) {
            $alreadyNotified = $manager->unreadNotifications()
                ->where('data->type', 'low_stock')
                ->where('data->warehouse_id', $warehouse->id)
                ->exists();
            if (!$alreadyNotified) {
                $manager->notify($notification);
            }
        }
    }

    /**
     * Auto-Fulfillment Engine
     * Called when stock is restocked at a warehouse.
     * Checks for PARTIAL_PENDING / PRE_ORDER orders with auto_reserve = true
     * and fulfils their pending_quantity if stock is now available.
     *
     * Each restock batch:
     *  - sets total_quantity  = canFulfil  (this batch size for driver)
     *  - resets status        = 'Pending'  (manager must re-approve + assign driver)
     *  - reduces pending_quantity by canFulfil
     *  - deducts from warehouse stock immediately (reserved)
     */
    public static function autoFulfillPendingOrders(int $warehouseId): void
    {
        $currentStock = (int) WarehouseStock::where('warehouse_id', $warehouseId)->sum('quantity');
        if ($currentStock <= 0) return;

        $pendingOrders = Order::where('warehouse_id', $warehouseId)
            ->whereIn('order_type', ['PARTIAL_PENDING', 'PRE_ORDER'])
            ->where('auto_reserve', true)
            ->where('pending_quantity', '>', 0)
            ->orderBy('created_at')
            ->get();

        if ($pendingOrders->isEmpty()) return;

        foreach ($pendingOrders as $order) {
            $items = is_array($order->items_summary)
                ? $order->items_summary
                : json_decode($order->items_summary ?? '[]', true);

            if (empty($items) || !is_array($items)) continue;

            $batchItems = [];
            $canFulfil = 0;

            foreach ($items as $item) {
                $typeId = (int)($item['cylinder_type_id'] ?? 0);
                if (!$typeId) continue;

                $delivered = (int)($item['delivered_qty'] ?? 0);
                $original  = (int)($item['quantity'] ?? 0);
                $needed    = max(0, $original - $delivered);

                if ($needed <= 0) continue;

                $availableForType = (int) WarehouseStock::where('warehouse_id', $warehouseId)
                    ->where('cylinder_type_id', $typeId)
                    ->sum('quantity');

                $allocated = min($needed, $availableForType);
                if ($allocated > 0) {
                    $batchItems[] = [
                        'cylinder_type_id' => $typeId,
                        'quantity'         => $allocated,
                    ];
                    $canFulfil += $allocated;
                }
            }

            if ($canFulfil <= 0) continue;

            DB::transaction(function () use ($order, $canFulfil, $batchItems, $warehouseId) {
                $newPending = max(0, (int)$order->pending_quantity - $canFulfil);
                $isComplete = $newPending <= 0;

                $order->update([
                    'total_quantity'     => $order->requested_quantity,
                    'remaining_quantity' => $canFulfil,
                    'pending_quantity'   => $newPending,
                    'order_type'         => $isComplete ? 'FULFILLED' : $order->order_type,
                    'partial_status'     => $isComplete ? 'FULFILLED' : $order->partial_status,
                    'trip_id'            => null,
                    'assigned_driver_id' => null,
                    'status'             => 'Pending',
                    'batch_items'         => $batchItems,
                ]);

                $order->user?->notify(new PartialOrderFulfilled(
                    ['id' => $order->id, 'order_number' => $order->order_number],
                    $canFulfil
                ));
            });
        }
    }
}
