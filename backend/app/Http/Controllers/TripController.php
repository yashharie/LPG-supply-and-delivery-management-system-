<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Trip;
use App\Models\TripOrder;
use App\Models\Order;
use App\Models\WarehouseStock;
use App\Models\StockHistory;
use App\Models\User;
use App\Notifications\OrderStatusChanged;
use App\Services\StockAlertService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class TripController extends Controller
{
    /*──────────────────────────────────────────────────
     | DRIVER: list approved orders available to accept
     | GET /api/driver/available-orders
     ──────────────────────────────────────────────────*/
    public function availableOrders(Request $request)
    {
        $driver = $request->user();

        // Only orders that are Approved or Partially Delivered, belong to driver's warehouse, and assigned to this driver specifically, and not yet in a trip
        $orders = Order::with(['user', 'warehouse'])
            ->whereIn('status', ['Approved', 'Partially Delivered'])
            ->where('warehouse_id', $driver->warehouse_id)
            ->where('assigned_driver_id', $driver->id)
            ->whereNull('trip_id')
            ->latest()
            ->get();

        return response()->json($orders);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: create a new trip by accepting orders
     | POST /api/driver/trips
     ──────────────────────────────────────────────────*/
    public function createTrip(Request $request)
    {
        $request->validate([
            'orders'                     => 'required|array|min:1',
            'orders.*.order_id'          => 'required|exists:orders,id',
            'orders.*.accepted_quantity' => 'required|integer|min:1',
            'notes'                      => 'nullable|string|max:500',
        ]);

        $driver = $request->user();
        $orderData = $request->orders;
        $orderIds = array_column($orderData, 'order_id');

        // Verify orders belong to driver's warehouse and assigned to them, and not currently in any trip
        $orders = Order::whereIn('id', $orderIds)
            ->whereIn('status', ['Approved', 'Partially Delivered'])
            ->where('warehouse_id', $driver->warehouse_id)
            ->where('assigned_driver_id', $driver->id)
            ->whereNull('trip_id')
            ->get();

        if ($orders->count() !== count($orderIds)) {
            return response()->json([
                'status'  => false,
                'message' => 'One or more orders are not available, not assigned to you, or not from your warehouse.',
            ], 422);
        }

        // Validate accepted quantities do not exceed remaining quantities
        $orderDataMap = [];
        foreach ($orderData as $od) {
            $orderDataMap[$od['order_id']] = (int) $od['accepted_quantity'];
        }

        foreach ($orders as $order) {
            $remaining = $order->remaining_quantity > 0
                ? $order->remaining_quantity   // batch size for partial orders
                : ($order->total_quantity - $order->delivered_quantity); // normal orders
            $accepted = $orderDataMap[$order->id];
            if ($accepted > $remaining) {
                return response()->json([
                    'status'  => false,
                    'message' => "Accepted quantity ($accepted) for order #{$order->order_number} exceeds this batch size ($remaining).",
                ], 422);
            }
        }

        DB::transaction(function () use ($driver, $orders, $orderDataMap, $request) {
            $trip = Trip::create([
                'driver_id'    => $driver->id,
                'warehouse_id' => $driver->warehouse_id,
                'status'       => 'pending',
                'total_loaded' => 0, // set on Start Trip
                'notes'        => $request->notes,
            ]);

            foreach ($orders as $order) {
                $acceptedQty = $orderDataMap[$order->id];
                TripOrder::create([
                    'trip_id'            => $trip->id,
                    'order_id'           => $order->id,
                    'accepted_quantity'  => $acceptedQty,
                    'delivered_quantity' => 0,
                    'status'             => 'pending',
                ]);
                $order->update(['trip_id' => $trip->id]);
            }
        });

        $trip = Trip::where('driver_id', $driver->id)
            ->where('status', 'pending')
            ->with(['orders.user', 'orders.warehouse', 'warehouse.stocks', 'tripOrders'])
            ->latest()
            ->first();

        return response()->json([
            'status'  => true,
            'message' => 'Trip created. Press Start Trip when ready to depart.',
            'trip'    => $trip,
        ], 201);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: get current active/pending trip
     | GET /api/driver/trips/current
     ──────────────────────────────────────────────────*/
    public function currentTrip(Request $request)
    {
        $driver = $request->user();

        // Retrieve both pending and active trips
        $trips = Trip::where('driver_id', $driver->id)
            ->whereIn('status', ['pending', 'active'])
            ->with(['orders.user', 'orders.warehouse', 'warehouse.stocks', 'tripOrders'])
            ->latest()
            ->get();

        return response()->json(['trips' => $trips]);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: start trip
     | POST /api/driver/trips/{id}/start
     | Deducts stock from warehouse
     ──────────────────────────────────────────────────*/
    /*──────────────────────────────────────────────────
     | DRIVER: save loading quantities for a trip
     | POST /api/driver/trips/{id}/load
     | Body: { loaded_items: [{ cylinder_type_id, quantity }] }
     ──────────────────────────────────────────────────*/
    public function loadTrip(Request $request, $id)
    {
        $request->validate([
            'loaded_items'                     => 'required|array|min:1',
            'loaded_items.*.cylinder_type_id'  => 'required|exists:cylinder_types,id',
            'loaded_items.*.quantity'          => 'required|integer|min:0',
        ]);

        $driver = $request->user();
        $trip   = Trip::where('id', $id)->where('driver_id', $driver->id)->firstOrFail();

        if ($trip->status !== 'pending') {
            return response()->json(['status' => false, 'message' => 'Trip is already started or ended. Loading is locked.'], 422);
        }

        // Validate loaded quantities do not exceed available warehouse stock
        $warehouseStocks = WarehouseStock::where('warehouse_id', $trip->warehouse_id)->get()->keyBy('cylinder_type_id');
        foreach ($request->loaded_items as $item) {
            $typeId = $item['cylinder_type_id'];
            $qty = (int)$item['quantity'];

            $stock = $warehouseStocks->get($typeId);
            $available = $stock ? (int)$stock->quantity : 0;

            if ($qty > $available) {
                $typeName = \App\Models\CylinderType::find($typeId)?->name ?? "Type #{$typeId}";
                return response()->json([
                    'status' => false,
                    'message' => "Cannot load {$qty} of {$typeName}. Only {$available} available in warehouse stock."
                ], 422);
            }
        }

        $trip->update([
            'loaded_items' => $request->loaded_items,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Loading quantities saved successfully.',
            'trip'    => $trip->fresh()->load(['orders.user', 'warehouse.stocks', 'tripOrders']),
        ]);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: start trip
     | POST /api/driver/trips/{id}/start
     | Deducts stock from warehouse
     ──────────────────────────────────────────────────*/
    public function startTrip(Request $request, $id)
    {
        $driver = $request->user();
        $trip   = Trip::where('id', $id)->where('driver_id', $driver->id)->firstOrFail();

        if ($trip->status !== 'pending') {
            return response()->json(['status' => false, 'message' => 'Trip already started or ended.'], 422);
        }

        if (empty($trip->loaded_items)) {
            return response()->json(['status' => false, 'message' => 'Please enter loaded quantities before starting the trip.'], 422);
        }

        // Validate driver has no other active trip
        $activeTrip = Trip::where('driver_id', $driver->id)
            ->where('status', 'active')
            ->first();

        if ($activeTrip) {
            return response()->json([
                'status'  => false,
                'message' => 'You already have another active trip. End it before starting this one.',
            ], 422);
        }

        $tripOrders = $trip->tripOrders()->with('order')->get();
        $totalLoaded = collect($trip->loaded_items)->sum('quantity');

        DB::transaction(function () use ($trip, $tripOrders, $totalLoaded, $driver) {
            foreach ($tripOrders as $to) {
                $order = $to->order;

                // Just update the order status to Out for Delivery.
                $order->update([
                    'status'             => 'Out for Delivery',
                    'assigned_driver_id' => $driver->id,
                ]);

                $order->user?->notify(new OrderStatusChanged(
                    ['id' => $order->id, 'order_number' => $order->order_number],
                    'Out for Delivery'
                ));
            }

            $trip->update([
                'status'       => 'active',
                'started_at'   => now(),
                'total_loaded' => $totalLoaded,
            ]);
        });

        return response()->json([
            'status'  => true,
            'message' => 'Trip started. GPS sharing is now active.',
            'trip'    => $trip->fresh()->load(['orders.user', 'warehouse', 'tripOrders']),
        ]);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: record partial / full delivery for one order
     | POST /api/driver/trips/{tripId}/deliver/{orderId}
     ──────────────────────────────────────────────────*/
    /*──────────────────────────────────────────────────
     | DRIVER: record partial / full delivery for one order
     | POST /api/driver/trips/{tripId}/deliver/{orderId}
     ──────────────────────────────────────────────────*/
    public function recordDelivery(Request $request, $tripId, $orderId)
    {
        $driver    = $request->user();
        $trip      = Trip::where('id', $tripId)->where('driver_id', $driver->id)->firstOrFail();
        $tripOrder = TripOrder::where('trip_id', $tripId)->where('order_id', $orderId)->firstOrFail();
        $order     = Order::findOrFail($orderId);

        $tempDetails = $order->temp_delivery_details;
        if (empty($tempDetails)) {
            $tempDetails = $request->input('delivered_items', []);
        }
        if (empty($tempDetails)) {
            return response()->json(['status' => false, 'message' => 'No delivery details found. Please generate OTP again.'], 422);
        }

        $deliveredNow = collect($tempDetails)->sum('quantity');

        DB::transaction(function () use ($tripOrder, $order, $tempDetails, $deliveredNow, $trip, $driver) {
            // Update trip_orders delivered_items (pivot)
            $currentDeliveredItems = $tripOrder->delivered_items ?? [];

            // Merge current and new delivered items
            foreach ($tempDetails as $item) {
                $typeId = (int)$item['cylinder_type_id'];
                $qtyNow = (int)$item['quantity'];

                $found = false;
                foreach ($currentDeliveredItems as &$cdi) {
                    if ((int)$cdi['cylinder_type_id'] === $typeId) {
                        $cdi['quantity'] = (int)$cdi['quantity'] + $qtyNow;
                        $found = true;
                        break;
                    }
                }
                if (!$found) {
                    $currentDeliveredItems[] = [
                        'cylinder_type_id' => $typeId,
                        'quantity'         => $qtyNow,
                    ];
                }
            }

            $tripOrder->update([
                'delivered_items'    => $currentDeliveredItems,
                'delivered_quantity' => $tripOrder->delivered_quantity + $deliveredNow,
            ]);

            // Update order's items_summary (delivered_qty per item)
            $orderItems = is_array($order->items_summary)
                ? $order->items_summary
                : json_decode($order->items_summary ?? '[]', true);

            foreach ($tempDetails as $item) {
                $typeId = (int)$item['cylinder_type_id'];
                $qtyNow = (int)$item['quantity'];

                foreach ($orderItems as &$oi) {
                    if ((int)($oi['cylinder_type_id'] ?? 0) === $typeId) {
                        $oi['delivered_qty'] = (int)($oi['delivered_qty'] ?? 0) + $qtyNow;
                        break;
                    }
                }
            }

            $order->increment('delivered_quantity', $deliveredNow);
            $overallDelivered = $order->fresh()->delivered_quantity;
            $fullOrderQty = $order->requested_quantity ?? $order->total_quantity;

            $isComplete = $overallDelivered >= $fullOrderQty;

            $order->update([
                'status'                => $isComplete ? 'Delivered' : 'Partially Delivered',
                'order_type'            => $isComplete ? 'FULFILLED' : $order->order_type,
                'pending_quantity'      => max(0, $fullOrderQty - $overallDelivered),
                'items_summary'         => $orderItems,
                'temp_delivery_details' => null, // clear temp
            ]);

            // Record StockHistory and decrement warehouse stock for each type in this delivery batch
            foreach ($tempDetails as $item) {
                $typeId = (int)$item['cylinder_type_id'];
                $qtyNow = (int)$item['quantity'];
                if ($qtyNow <= 0) continue;

                // Decrement warehouse stock
                $ws = \App\Models\WarehouseStock::where('warehouse_id', $order->warehouse_id)
                    ->where('cylinder_type_id', $typeId)
                    ->first();
                if ($ws) {
                    $ws->decrement('quantity', $qtyNow);
                }

                StockHistory::create([
                    'warehouse_id'     => $order->warehouse_id,
                    'cylinder_type_id' => $typeId,
                    'order_id'         => $order->id,
                    'user_id'          => $driver->id,
                    'trip_id'          => $trip->id,
                    'type'             => 'out',
                    'quantity'         => $qtyNow,
                    'note'             => $isComplete
                        ? "Order #{$order->order_number} delivery completed"
                        : "Order #{$order->order_number} delivery recorded — partial batch",
                ]);
            }

            // Update trip's total delivered
            $trip->increment('total_delivered', $deliveredNow);

            // Update trip_order status
            $isFullyDeliveredInTrip = $tripOrder->delivered_quantity >= $tripOrder->accepted_quantity;
            $tripOrder->update([
                'status' => $isFullyDeliveredInTrip ? 'delivered' : 'partial'
            ]);

            $order->user?->notify(new OrderStatusChanged(
                ['id' => $order->id, 'order_number' => $order->order_number],
                $isComplete ? 'Delivered' : 'Partially Delivered'
            ));
        });

        return response()->json([
            'status'            => true,
            'message'           => "Delivery of {$deliveredNow} cylinders recorded.",
            'delivered_total'   => $tripOrder->fresh()->delivered_quantity,
            'remaining'         => max(0, $tripOrder->accepted_quantity - $tripOrder->fresh()->delivered_quantity),
            'order_status'      => $order->fresh()->status,
        ]);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: end trip
     | POST /api/driver/trips/{id}/end
     | Returns undelivered stock to warehouse
     ──────────────────────────────────────────────────*/
    public function endTrip(Request $request, $id)
    {
        $driver = $request->user();
        $trip   = Trip::where('id', $id)->where('driver_id', $driver->id)->firstOrFail();

        if ($trip->status !== 'active') {
            return response()->json(['status' => false, 'message' => 'Trip is not active.'], 422);
        }

        $tripOrders = $trip->tripOrders()->with('order')->get();
        $deliveryInputs = $request->input('delivery_inputs', []);

        DB::transaction(function () use ($trip, $tripOrders, $deliveryInputs, $driver) {
            // 1. Process additional deliveries from delivery_inputs first
            if (!empty($deliveryInputs) && is_array($deliveryInputs)) {
                foreach ($deliveryInputs as $input) {
                    $orderId = $input['order_id'] ?? null;
                    $deliveredItemsInput = $input['delivered_items'] ?? [];
                    if (!$orderId || empty($deliveredItemsInput)) continue;

                    $to = $tripOrders->firstWhere('order_id', $orderId);
                    if (!$to) continue;

                    $order = $to->order;
                    $totalDeliveredNow = 0;

                    // Update trip_orders delivered_items (pivot)
                    $currentDeliveredItems = $to->delivered_items ?? [];
                    foreach ($deliveredItemsInput as $item) {
                        $typeId = (int)$item['cylinder_type_id'];
                        $qtyNow = (int)$item['quantity'];
                        if ($qtyNow <= 0) continue;

                        $totalDeliveredNow += $qtyNow;

                        $found = false;
                        foreach ($currentDeliveredItems as &$cdi) {
                            if ((int)$cdi['cylinder_type_id'] === $typeId) {
                                $cdi['quantity'] = (int)$cdi['quantity'] + $qtyNow;
                                $found = true;
                                break;
                            }
                        }
                        if (!$found) {
                            $currentDeliveredItems[] = [
                                'cylinder_type_id' => $typeId,
                                'quantity'         => $qtyNow,
                            ];
                        }
                    }

                    if ($totalDeliveredNow > 0) {
                        $to->update([
                            'delivered_items'    => $currentDeliveredItems,
                            'delivered_quantity' => $to->delivered_quantity + $totalDeliveredNow,
                        ]);

                        // Update order's items_summary (delivered_qty per item)
                        $orderItems = is_array($order->items_summary)
                            ? $order->items_summary
                            : json_decode($order->items_summary ?? '[]', true);

                        foreach ($deliveredItemsInput as $item) {
                            $typeId = (int)$item['cylinder_type_id'];
                            $qtyNow = (int)$item['quantity'];
                            if ($qtyNow <= 0) continue;

                            foreach ($orderItems as &$oi) {
                                if ((int)($oi['cylinder_type_id'] ?? 0) === $typeId) {
                                    $oi['delivered_qty'] = (int)($oi['delivered_qty'] ?? 0) + $qtyNow;
                                    break;
                                }
                            }
                        }

                        $order->increment('delivered_quantity', $totalDeliveredNow);
                        $overallDelivered = $order->fresh()->delivered_quantity;
                        $fullOrderQty = $order->requested_quantity ?? $order->total_quantity;

                        $isComplete = $overallDelivered >= $fullOrderQty;

                        $order->update([
                            'status'                => $isComplete ? 'Delivered' : 'Partially Delivered',
                            'order_type'            => $isComplete ? 'FULFILLED' : $order->order_type,
                            'pending_quantity'      => max(0, $fullOrderQty - $overallDelivered),
                            'items_summary'         => $orderItems,
                        ]);

                        // Record StockHistory and decrement warehouse stock for each type in this delivery batch
                        foreach ($deliveredItemsInput as $item) {
                            $typeId = (int)$item['cylinder_type_id'];
                            $qtyNow = (int)$item['quantity'];
                            if ($qtyNow <= 0) continue;

                            // Decrement warehouse stock
                            $ws = \App\Models\WarehouseStock::where('warehouse_id', $order->warehouse_id)
                                ->where('cylinder_type_id', $typeId)
                                ->first();
                            if ($ws) {
                                $ws->decrement('quantity', $qtyNow);
                            }

                            StockHistory::create([
                                'warehouse_id'     => $order->warehouse_id,
                                'cylinder_type_id' => $typeId,
                                'order_id'         => $order->id,
                                'user_id'          => $driver->id,
                                'trip_id'          => $trip->id,
                                'type'             => 'out',
                                'quantity'         => $qtyNow,
                                'note'             => $isComplete
                                    ? "Order #{$order->order_number} final delivery completed during trip end"
                                    : "Order #{$order->order_number} final delivery recorded during trip end — partial batch",
                            ]);
                        }

                        $trip->increment('total_delivered', $totalDeliveredNow);
                    }
                }
            }

            // Refresh pivot details after processing deliveries
            $tripOrders = $trip->tripOrders()->with('order')->get();

            // 2. Log undelivered cylinders returning to warehouse
            $loadedItems = collect($trip->loaded_items ?? []);

            $deliveredByType = [];
            foreach ($tripOrders as $to) {
                foreach ($to->delivered_items ?? [] as $item) {
                    $typeId = (int)$item['cylinder_type_id'];
                    $deliveredByType[$typeId] = ($deliveredByType[$typeId] ?? 0) + (int)$item['quantity'];
                }
            }

            foreach ($loadedItems as $item) {
                $typeId    = (int) $item['cylinder_type_id'];
                $loadedQty = (int) $item['quantity'];
                $delivQty  = (int) ($deliveredByType[$typeId] ?? 0);
                $remaining = max(0, $loadedQty - $delivQty);

                if ($remaining > 0) {
                    $stockRow = WarehouseStock::where('warehouse_id', $trip->warehouse_id)
                        ->where('cylinder_type_id', $typeId)->first();

                    if ($stockRow) {
                        $stockRow->increment('quantity', $remaining);
                    } else {
                        WarehouseStock::create([
                            'warehouse_id'     => $trip->warehouse_id,
                            'cylinder_type_id' => $typeId,
                            'quantity'         => $remaining,
                        ]);
                    }

                    StockHistory::create([
                        'warehouse_id'     => $trip->warehouse_id,
                        'cylinder_type_id' => $typeId,
                        'user_id'          => $driver->id,
                        'trip_id'          => $trip->id,
                        'type'             => 'in',
                        'quantity'         => $remaining,
                        'note'             => "Trip #{$trip->id} ended — {$remaining} undelivered cylinders returned to stock",
                    ]);
                }
            }

            // Free orders that are not fully delivered
            foreach ($tripOrders as $to) {
                $order    = $to->order;
                $freshOrder = $order->fresh();
                $fullQty     = $freshOrder->requested_quantity ?? $freshOrder->total_quantity;

                if ($freshOrder->delivered_quantity < $fullQty) {
                    $order->update([
                        'trip_id' => null,
                        'status'  => 'Partially Delivered',
                    ]);
                }

                $to->update(['status' => $to->delivered_quantity >= $to->accepted_quantity ? 'delivered' : 'partial']);
            }

            $trip->update(['status' => 'ended', 'ended_at' => now()]);
        });

        // Release driver load
        $driver->update(['driver_current_load' => 0]);

        // Trigger auto-fulfillment for reserved orders
        \App\Services\StockAlertService::autoFulfillPendingOrders($trip->warehouse_id);

        return response()->json([
            'status'  => true,
            'message' => 'Trip ended. Stock updated based on actual deliveries.',
        ]);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: trip history
     | GET /api/driver/trips/history
     ──────────────────────────────────────────────────*/
    public function tripHistory(Request $request)
    {
        $trips = Trip::where('driver_id', $request->user()->id)
            ->where('status', 'ended')
            ->with(['orders.user', 'warehouse'])
            ->latest()
            ->take(20)
            ->get();

        return response()->json($trips);
    }

    /*──────────────────────────────────────────────────
     | ADMIN/MANAGER: all trips for a warehouse
     | GET /api/trips?warehouse_id=&status=
     ──────────────────────────────────────────────────*/
    public function index(Request $request)
    {
        $query = Trip::with(['driver', 'warehouse', 'orders.user'])->latest();

        if ($request->warehouse_id) $query->where('warehouse_id', $request->warehouse_id);
        if ($request->status)       $query->where('status', $request->status);

        return response()->json($query->take(50)->get());
    }

    /*──────────────────────────────────────────────────
     | DRIVER: generate delivery OTP for an order
     | POST /api/driver/trips/{tripId}/deliver/{orderId}/otp-generate
     | Body: { quantity }
     ──────────────────────────────────────────────────*/
    public function generateDeliveryOtp(Request $request, $tripId, $orderId)
    {
        $request->validate([
            'delivered_items'                     => 'required|array|min:1',
            'delivered_items.*.cylinder_type_id'  => 'required|exists:cylinder_types,id',
            'delivered_items.*.quantity'          => 'required|integer|min:0',
        ]);

        $driver    = $request->user();
        $trip      = Trip::where('id', $tripId)->where('driver_id', $driver->id)->firstOrFail();
        $tripOrder = TripOrder::where('trip_id', $tripId)->where('order_id', $orderId)->firstOrFail();
        $order     = Order::findOrFail($orderId);

        $deliveredItems = $request->delivered_items;
        $totalQtyNow = collect($deliveredItems)->sum('quantity');

        if ($totalQtyNow <= 0) {
            return response()->json(['status' => false, 'message' => 'Delivered quantity must be greater than zero.'], 422);
        }

        // 1. Validate against remaining truck stock
        $loadedItems = collect($trip->loaded_items ?? []);

        // Total delivered in other trip orders
        $otherTripOrders = TripOrder::where('trip_id', $tripId)->where('id', '!=', $tripOrder->id)->get();
        $deliveredInOthers = [];
        foreach ($otherTripOrders as $oto) {
            foreach ($oto->delivered_items ?? [] as $item) {
                $typeId = $item['cylinder_type_id'];
                $deliveredInOthers[$typeId] = ($deliveredInOthers[$typeId] ?? 0) + $item['quantity'];
            }
        }

        // Already delivered in this trip order
        $deliveredInSelf = [];
        foreach ($tripOrder->delivered_items ?? [] as $item) {
            $typeId = $item['cylinder_type_id'];
            $deliveredInSelf[$typeId] = ($deliveredInSelf[$typeId] ?? 0) + $item['quantity'];
        }

        $orderItems = is_array($order->items_summary)
            ? $order->items_summary
            : json_decode($order->items_summary ?? '[]', true);

        foreach ($deliveredItems as $item) {
            $typeId = (int)$item['cylinder_type_id'];
            $qtyNow = (int)$item['quantity'];
            if ($qtyNow <= 0) continue;

            $loadedQty = (int) ($loadedItems->firstWhere('cylinder_type_id', $typeId)['quantity'] ?? 0);
            $otherQty  = (int) ($deliveredInOthers[$typeId] ?? 0);
            $selfQty   = (int) ($deliveredInSelf[$typeId] ?? 0);

            $remainingOnTruck = max(0, $loadedQty - $otherQty - $selfQty);

            if ($qtyNow > $remainingOnTruck) {
                $typeName = \App\Models\CylinderType::find($typeId)?->name ?? "Type #{$typeId}";
                return response()->json([
                    'status'  => false,
                    'message' => "Cannot deliver {$qtyNow} of {$typeName}. Only {$remainingOnTruck} left on truck.",
                ], 422);
            }

            // 2. Validate against ordered remaining quantity
            $orderItem = collect($orderItems)->firstWhere('cylinder_type_id', $typeId);
            if (!$orderItem) {
                return response()->json(['status' => false, 'message' => "Cylinder type #{$typeId} is not in the original order."], 422);
            }

            $orderedNeeded = max(0, (int)$orderItem['quantity'] - (int)($orderItem['delivered_qty'] ?? 0));
            if ($qtyNow > $orderedNeeded) {
                $typeName = \App\Models\CylinderType::find($typeId)?->name ?? "Type #{$typeId}";
                return response()->json([
                    'status'  => false,
                    'message' => "Cannot deliver {$qtyNow} of {$typeName}. Customer only needs {$orderedNeeded} more.",
                ], 422);
            }
        }

        // Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $order->update([
            'delivery_otp'            => $otp,
            'delivery_otp_expires_at' => now()->addMinutes(10),
            'delivery_otp_verified'   => false,
            'temp_delivery_details'   => $deliveredItems,
        ]);

        // Notify client
        try {
            $order->user?->notify(new \App\Notifications\DeliveryOtp(
                otp:         $otp,
                orderNumber: $order->order_number,
                quantity:    $totalQtyNow,
                driverName:  $driver->name,
            ));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("DeliveryOtp mail failed: " . $e->getMessage());
        }

        return response()->json([
            'status'   => true,
            'message'  => "OTP generated. Client has been notified.",
            'quantity' => $totalQtyNow,
            'otp_dev'  => null,
        ]);
    }

    /*──────────────────────────────────────────────────
     | DRIVER: verify OTP and record delivery
     | POST /api/driver/trips/{tripId}/deliver/{orderId}/otp-verify
     | Body: { otp }
     ──────────────────────────────────────────────────*/
    public function verifyDeliveryOtp(Request $request, $tripId, $orderId)
    {
        $request->validate([
            'otp'      => 'required|string|size:6',
        ]);

        $driver    = $request->user();
        $trip      = Trip::where('id', $tripId)->where('driver_id', $driver->id)->firstOrFail();
        $tripOrder = TripOrder::where('trip_id', $tripId)->where('order_id', $orderId)->firstOrFail();
        $order     = Order::findOrFail($orderId);

        if (!$order->delivery_otp) {
            return response()->json(['status' => false, 'message' => 'No OTP generated. Generate one first.'], 422);
        }
        if ($order->delivery_otp_verified) {
            return response()->json(['status' => false, 'message' => 'OTP already used for this delivery.'], 422);
        }
        if (now()->isAfter($order->delivery_otp_expires_at)) {
            return response()->json(['status' => false, 'message' => 'OTP expired (10 min limit). Please generate a new one.'], 422);
        }
        if ($request->otp !== $order->delivery_otp) {
            return response()->json(['status' => false, 'message' => 'Incorrect OTP. Ask the client to check their email/notification.'], 422);
        }

        // Mark OTP verified + clear it
        $order->update([
            'delivery_otp_verified'   => true,
            'delivery_otp'            => null,
            'delivery_otp_expires_at' => null,
        ]);

        return $this->recordDelivery($request, $tripId, $orderId);
    }
}
