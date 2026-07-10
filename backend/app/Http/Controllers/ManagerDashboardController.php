<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use App\Models\User;
use App\Notifications\OrderStatusChanged;
use Illuminate\Support\Facades\DB;

class ManagerDashboardController extends Controller
{
    public function index(Request $request)
    {
        $manager = $request->user();

        // Manager sees only their assigned warehouse's data
        $warehouseId = $manager->warehouse_id;

        $ordersQuery = Order::query();
        $stockQuery  = WarehouseStock::query();

        if ($warehouseId) {
            $ordersQuery->where('warehouse_id', $warehouseId);
            $stockQuery->where('warehouse_id', $warehouseId);
        }

        $recentOrders = (clone $ordersQuery)->with(['user', 'warehouse', 'driver'])->latest()->take(50)->get();

        $stock = [];
        if ($warehouseId) {
            $stock = WarehouseStock::where('warehouse_id', $warehouseId)
                ->with('cylinderType.brand')
                ->get();
        }
        $cylinderTypes = \App\Models\CylinderType::with('brand')->get();

        return response()->json([
            'manager'    => $manager,
            'warehouse'  => $warehouseId ? Warehouse::find($warehouseId) : null,
            'stats' => [
                'total_orders'     => (clone $ordersQuery)->count(),
                'pending_orders'   => (clone $ordersQuery)->where('status', 'Pending')->count(),
                'approved_orders'  => (clone $ordersQuery)->where('status', 'Approved')->count(),
                'delivered_orders' => (clone $ordersQuery)->where('status', 'Delivered')->count(),
                'total_stock'      => $stockQuery->sum('quantity'),
            ],
            'recent_orders' => $recentOrders,
            // Drivers assigned to this warehouse
            'drivers' => User::where('role', 'driver')
                ->when($warehouseId, fn ($q) => $q->where('warehouse_id', $warehouseId))
                ->get(),
            'stock' => $stock,
            'cylinder_types' => $cylinderTypes,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | MANAGER: ASSIGN DRIVER TO ORDER
    |--------------------------------------------------------------------------
    */
    public function assignDriver(Request $request, $id)
    {
        $request->validate(['driver_id' => 'required|exists:users,id']);
        $manager = $request->user();
        $order   = Order::findOrFail($id);
        if ($manager->warehouse_id && $order->warehouse_id !== $manager->warehouse_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $driver = User::findOrFail($request->driver_id);
        if ($driver->role !== 'driver') {
            return response()->json(['message' => 'Selected user is not a driver.'], 422);
        }

        // ── Driver load capacity check (live from DB — never stale) ──
        $liveLoad = (int) Order::where('assigned_driver_id', $driver->id)
            ->where('status', 'Out for Delivery')
            ->sum('total_quantity');

        $driver->update(['driver_current_load' => $liveLoad]);

        $newLoad  = $liveLoad + $order->total_quantity;
        if ($newLoad > $driver->driver_max_capacity) {
            $available = $driver->driver_max_capacity - $liveLoad;
            return response()->json([
                'status'         => false,
                'message'        => "Driver is at capacity. Active load: {$liveLoad}/{$driver->driver_max_capacity}. "
                                  . "This order needs {$order->total_quantity} cylinders but only " . max(0, $available) . " space remaining.",
                'current_load'   => $liveLoad,
                'max_capacity'   => $driver->driver_max_capacity,
                'order_quantity' => $order->total_quantity,
                'available'      => max(0, $available),
            ], 422);
        }

        $order->update(['assigned_driver_id' => $request->driver_id]);
        $driver->increment('driver_current_load', $order->total_quantity);

        return response()->json([
            'status'          => true,
            'message'         => 'Driver assigned.',
            'order'           => $order,
            'driver_load'     => $driver->fresh()->driver_current_load,
            'driver_capacity' => $driver->driver_max_capacity,
        ]);
    }

    public function approve(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $manager = $request->user();
        if ($manager->warehouse_id && $order->warehouse_id !== $manager->warehouse_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Get batch items to deduct
        $batchItems = $order->batch_items;
        if (empty($batchItems)) {
            // Fallback for old orders: construct from items_summary
            $items = is_array($order->items_summary)
                ? $order->items_summary
                : json_decode($order->items_summary ?? '[]', true);
            $batchItems = [];
            if ($items && is_array($items)) {
                foreach ($items as $item) {
                    $batchItems[] = [
                        'cylinder_type_id' => (int)($item['cylinder_type_id'] ?? 0),
                        'quantity'         => (int)($item['quantity'] ?? 0),
                    ];
                }
            }
        }

        // ── Pre-approval stock check — fail if stock is insufficient ──
        foreach ($batchItems as $item) {
            $qty            = (int)($item['quantity'] ?? 0);
            $cylinderTypeId = $item['cylinder_type_id'] ?? null;
            if ($qty <= 0 || !$cylinderTypeId) continue;

            $available = (int) \App\Models\WarehouseStock::where('warehouse_id', $order->warehouse_id)
                ->where('cylinder_type_id', $cylinderTypeId)
                ->sum('quantity');

            if ($available < $qty) {
                $typeName = \App\Models\CylinderType::find($cylinderTypeId)?->name ?? "Type #{$cylinderTypeId}";
                return response()->json([
                    'status'  => false,
                    'message' => "Cannot approve: Insufficient stock for {$typeName} at this warehouse. Required: {$qty}, Available: {$available}.",
                ], 422);
            }
        }

        // ── Deduct stock atomically with pessimistic lock ──
        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($order, $batchItems, $manager) {
                foreach ($batchItems as $item) {
                    $qty            = (int)($item['quantity'] ?? 0);
                    $cylinderTypeId = $item['cylinder_type_id'] ?? null;
                    if ($qty <= 0 || !$cylinderTypeId) continue;

                    // Pessimistic lock
                    $stock = \App\Models\WarehouseStock::where('warehouse_id', $order->warehouse_id)
                        ->where('cylinder_type_id', $cylinderTypeId)
                        ->lockForUpdate()
                        ->first();

                    if (!$stock || $stock->quantity < $qty) {
                        $typeName = \App\Models\CylinderType::find($cylinderTypeId)?->name ?? "Type #{$cylinderTypeId}";
                        throw new \Exception("Cannot approve: Insufficient stock for {$typeName} during transaction locking.");
                    }

                    // $stock->decrement('quantity', $qty);
                }

                $order->update(['status' => 'Approved']);
            });
        } catch (\Exception $e) {
            return response()->json([
                'status'  => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        \App\Services\StockAlertService::checkAfterDeduction($order->warehouse_id);

        $order->user?->notify(new OrderStatusChanged(
            ['id' => $order->id, 'order_number' => $order->order_number],
            'Approved'
        ));

        return response()->json(['status' => true, 'order' => $order->fresh()]);
    }

    public function reject(Request $request, $id)
    {
        $order = Order::findOrFail($id);
        $manager = $request->user();
        if ($manager->warehouse_id && $order->warehouse_id !== $manager->warehouse_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        // Do not return stock on reject since stock is not decremented on approval
        $order->update(['status' => 'Rejected']);
        $order->user?->notify(new OrderStatusChanged(
            ['id' => $order->id, 'order_number' => $order->order_number],
            'Rejected'
        ));
        return response()->json(['status' => true, 'order' => $order]);
    }

    /*─────────────────────────────────────────────
     | PRIVATE: Return reserved stock when rejecting
     ─────────────────────────────────────────────*/
    private function returnStockOnReject(Order $order, int $userId): void
    {
        $batchItems = $order->batch_items;
        if (empty($batchItems)) {
            // Fallback to items_summary
            $items = is_array($order->items_summary)
                ? $order->items_summary
                : json_decode($order->items_summary ?? '[]', true);
            $batchItems = [];
            if ($items && is_array($items)) {
                foreach ($items as $item) {
                    $batchItems[] = [
                        'cylinder_type_id' => (int)($item['cylinder_type_id'] ?? 0),
                        'quantity'         => (int)($item['quantity'] ?? 0),
                    ];
                }
            }
        }

        foreach ($batchItems as $item) {
            $qty            = (int)($item['quantity'] ?? 0);
            $cylinderTypeId = $item['cylinder_type_id'] ?? null;
            if ($qty <= 0 || !$cylinderTypeId) continue;

            $stock = \App\Models\WarehouseStock::where('warehouse_id', $order->warehouse_id)
                ->where('cylinder_type_id', $cylinderTypeId)->first();

            if ($stock) {
                $stock->increment('quantity', $qty);
            } else {
                \App\Models\WarehouseStock::create([
                    'warehouse_id'     => $order->warehouse_id,
                    'cylinder_type_id' => $cylinderTypeId,
                    'quantity'         => $qty,
                ]);
            }
            \App\Models\StockHistory::create([
                'warehouse_id'     => $order->warehouse_id,
                'cylinder_type_id' => $cylinderTypeId,
                'order_id'         => $order->id,
                'user_id'          => $userId,
                'type'             => 'in',
                'quantity'         => $qty,
                'note'             => "Order #{$order->order_number} rejected — reserved stock returned",
            ]);
        }
    }
}
