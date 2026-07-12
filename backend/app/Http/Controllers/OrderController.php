<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use App\Models\User;
use App\Notifications\OrderPlaced;
use App\Notifications\OrderStatusChanged;
use App\Notifications\PartialOrderFulfilled;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    /*─────────────────────────────────────────────
     | CLIENT: order history
     ─────────────────────────────────────────────*/
    public function getClientHistory()
    {
        return Order::where('user_id', Auth::id())
            ->with('warehouse')
            ->latest()
            ->get();
    }

    /*─────────────────────────────────────────────
     | ADMIN: all orders
     ─────────────────────────────────────────────*/
    public function index()
    {
        return Order::with(['user', 'warehouse', 'driver'])->latest()->get();
    }

    /*─────────────────────────────────────────────
     | NEAREST WAREHOUSE API
     | GET /api/warehouse/nearest?lat=&lng=&qty=
     |
     | Tie-break logic (in order):
     |  1. Shortest distance
     |  2. Most stock (if distance equal)
     |  3. Fewest active orders (if stock equal)
     |  4. Return ALL tied candidates so front-end
     |     can ask user to choose
     ─────────────────────────────────────────────*/
    public function nearest(Request $request)
    {
        $request->validate([
            'lat'   => 'required|numeric',
            'lng'   => 'required|numeric',
            'items' => 'nullable|string',
        ]);

        $userLat = (float) $request->lat;
        $userLng = (float) $request->lng;
        $items   = $request->items ? json_decode($request->items, true) : null;

        $result = $this->pickWarehouseForOrder($userLat, $userLng, $items);

        if ($result['needs_user_choice']) {
            return response()->json([
                'status'            => true,
                'needs_user_choice' => true,
                'nearest'           => $result['candidates'][0],
                'candidates'        => $result['candidates'],
            ]);
        }

        $wh = $result['nearest'];
        if (!$wh) {
            return response()->json([
                'status'  => false,
                'message' => 'No active warehouse found near your location.',
            ], 404);
        }

        $distance = $this->haversine($userLat, $userLng, (float)$wh->latitude, (float)$wh->longitude);
        $stock = WarehouseStock::where('warehouse_id', $wh->id)->sum('quantity');

        return response()->json([
            'status'            => true,
            'needs_user_choice' => false,
            'nearest'           => [
                'id'            => $wh->id,
                'name'          => $wh->name,
                'address'       => $wh->address,
                'latitude'      => $wh->latitude,
                'longitude'     => $wh->longitude,
                'distance_km'   => $distance,
                'stock'         => (int) $stock,
            ],
        ]);
    }

    /*─────────────────────────────────────────────
     | CLIENT: check stock before payment
     | Returns: full / partial / out-of-stock signal
     | Uses NEAREST warehouse only — no multi-warehouse
     ─────────────────────────────────────────────*/
    public function checkStock(Request $request)
    {
        $user = Auth::user();
        if (!$user->latitude || !$user->longitude) {
            return response()->json(['status' => false, 'message' => 'Please set your delivery location first.'], 422);
        }
        $request->validate([
            'items'               => 'required|string',
            'total_quantity'      => 'required|integer|min:20',
            'total_empty_returns' => 'nullable|integer|min:0',
            'total_cost'          => 'required|numeric',
        ]);
        $orderItems = json_decode($request->items, true);
        if (!$orderItems) return response()->json(['status' => false, 'message' => 'Invalid items.'], 422);

        $totalQty     = (int) $request->total_quantity;
        $totalReturns = (int) ($request->total_empty_returns ?? 0);
        if ($totalReturns > $totalQty) return response()->json(['status' => false, 'message' => 'Returns cannot exceed quantity.'], 422);
        foreach ($orderItems as $item) {
            if ((int)($item['emptyReturns'] ?? 0) > (int)($item['quantity'] ?? 0)) {
                return response()->json(['status' => false, 'message' => "Returns for {$item['name']} exceed quantity."], 422);
            }
            if ((int)($item['quantity'] ?? 0) > 100) {
                return response()->json(['status' => false, 'message' => "Maximum is 100 cylinders per cylinder type."], 422);
            }
        }

        $userLat     = (float) $user->latitude;
        $userLng     = (float) $user->longitude;
        $warehouseId = $request->warehouse_id ?? null;

        // Resolve the single nearest warehouse
        if ($warehouseId) {
            $wh = Warehouse::find($warehouseId);
        } else {
            $result = $this->pickWarehouseForOrder($userLat, $userLng, $orderItems);
            if ($result['needs_user_choice']) {
                return response()->json([
                    'status'            => true,
                    'needs_user_choice' => true,
                    'candidates'        => $result['candidates'],
                ]);
            }
            $wh = $result['nearest'];
        }

        if (!$wh) return response()->json(['status' => false, 'message' => 'No active warehouse found.'], 422);

        // ── Check stock per cylinder type (not total) ─────────────
        // Group requested quantities by cylinder_type_id
        $requestedByType = [];
        foreach ($orderItems as $item) {
            $typeId = (int)($item['cylinder_type_id'] ?? 0);
            $qty    = (int)($item['quantity'] ?? 0);
            $requestedByType[$typeId] = ($requestedByType[$typeId] ?? 0) + $qty;
        }

        // Check available stock for each requested type
        $totalAvailable = 0;
        $totalRequested = 0;
        $shortageByType = [];

        foreach ($requestedByType as $typeId => $requestedQty) {
            $availableForType = (int) WarehouseStock::where('warehouse_id', $wh->id)
                ->where('cylinder_type_id', $typeId)
                ->sum('quantity');

            $totalRequested += $requestedQty;
            $available       = min($availableForType, $requestedQty);
            $totalAvailable += $available;

            if ($availableForType < $requestedQty) {
                $shortageByType[$typeId] = [
                    'available' => $availableForType,
                    'requested' => $requestedQty,
                    'shortage'  => $requestedQty - $availableForType,
                ];
            }
        }

        $pendingQty = $totalRequested - $totalAvailable;

        // CASE 1: Out of stock — PRE_ORDER
        if ($totalAvailable === 0) {
            return response()->json([
                'status'         => true,
                'partial'        => true,
                'out_of_stock'   => true,
                'order_type'     => 'PRE_ORDER',
                'available_qty'  => 0,
                'requested_qty'  => $totalQty,
                'pending_qty'    => $totalQty,
                'warehouse_name' => $wh->name,
                'message'        => "This item is currently out of stock at {$wh->name}. Reason: The selected warehouse has no stock available for your selected cylinder types. You can place this as a pre-order. We will deliver it once stock is refilled.",
            ]);
        }

        // CASE 2: Partial stock — PARTIAL_PENDING
        if ($pendingQty > 0) {
            return response()->json([
                'status'         => true,
                'partial'        => true,
                'out_of_stock'   => false,
                'order_type'     => 'PARTIAL_PENDING',
                'available_qty'  => $totalAvailable,
                'requested_qty'  => $totalQty,
                'pending_qty'    => $pendingQty,
                'warehouse_name' => $wh->name,
                'message'        => "Only {$totalAvailable} cylinders are currently available at {$wh->name} out of {$totalQty} requested. Reason: Current stock is lower than your requested quantity. We can deliver {$totalAvailable} now and deliver the remaining {$pendingQty} once stock is refilled.",
            ]);
        }

        // CASE 3: Full stock — NORMAL
        return response()->json([
            'status'         => true,
            'partial'        => false,
            'order_type'     => 'NORMAL',
            'available_qty'  => $totalAvailable,
            'requested_qty'  => $totalQty,
            'warehouse_name' => $wh->name,
            'message'        => "All {$totalQty} cylinders are available at {$wh->name}.",
        ]);
    }

    /*─────────────────────────────────────────────
     | CLIENT: place normal order (full stock)
     | Nearest warehouse only — no split
     ─────────────────────────────────────────────*/
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$user->latitude || !$user->longitude) {
            return response()->json(['status' => false, 'message' => 'Please set your delivery location in Profile Settings first.'], 422);
        }

        $request->validate([
            'items'               => 'required|string',
            'total_quantity'      => 'required|integer|min:20',
            'total_empty_returns' => 'nullable|integer|min:0',
            'total_cost'          => 'required|numeric',
            'payment_receipt'     => 'required|file|mimes:jpeg,png,jpg,pdf|max:4096',
        ]);

        $orderItems   = json_decode($request->items, true);
        if (!$orderItems) return response()->json(['status' => false, 'message' => 'Invalid items format.'], 422);

        $totalQty     = (int) $request->total_quantity;
        $totalReturns = (int) ($request->total_empty_returns ?? 0);

        if ($totalReturns > $totalQty) return response()->json(['status' => false, 'message' => "Empty returns cannot exceed quantity ordered."], 422);
        foreach ($orderItems as $item) {
            if ((int)($item['emptyReturns'] ?? 0) > (int)($item['quantity'] ?? 0)) {
                return response()->json(['status' => false, 'message' => "Empty returns for {$item['name']} cannot exceed quantity ordered."], 422);
            }
            if ((int)($item['quantity'] ?? 0) > 100) {
                return response()->json(['status' => false, 'message' => "Maximum is 100 cylinders per cylinder type."], 422);
            }
        }

        $cylinderCost = (float) $request->total_cost;
        $receiptPath  = $request->file('payment_receipt')->store('receipts', 'public');
        $userLat      = (float) $user->latitude;
        $userLng      = (float) $user->longitude;

        // Resolve nearest warehouse using selection logic
        $warehouseId = $request->warehouse_id ?? null;
        if ($warehouseId) {
            $warehouse = Warehouse::find($warehouseId);
        } else {
            $result = $this->pickWarehouseForOrder($userLat, $userLng, $orderItems);
            if ($result['needs_user_choice']) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Multiple warehouses matched equally. Please select one.',
                ], 422);
            }
            $warehouse = $result['nearest'];
        }

        if (!$warehouse) return response()->json(['status' => false, 'message' => 'No active warehouse found.'], 422);

        $distanceKm  = $this->haversine($userLat, $userLng, (float)$warehouse->latitude, (float)$warehouse->longitude);
        $deliveryFee = max(100, round($distanceKm) * 100 + 100);
        $totalAmount = $cylinderCost + $deliveryFee;

        // Map items to include delivered_qty
        $itemsWithDelivered = array_map(function ($item) {
            $item['delivered_qty'] = 0;
            return $item;
        }, $orderItems);

        // Map batch_items
        $batchItems = array_map(fn($i) => [
            'cylinder_type_id' => (int) $i['cylinder_type_id'],
            'quantity'         => (int) $i['quantity'],
        ], $orderItems);

        $order = Order::create([
            'user_id'             => $user->id,
            'warehouse_id'        => $warehouse->id,
            'order_number'        => 'ORD-' . strtoupper(uniqid()),
            'total_quantity'      => $totalQty,
            'requested_quantity'  => $totalQty,
            'remaining_quantity'  => $totalQty,
            'delivered_quantity'  => 0,
            'total_empty_returns' => $totalReturns,
            'total_amount'        => $totalAmount,
            'receipt_path'        => $receiptPath,
            'status'              => 'Pending',
            'order_type'          => 'NORMAL',
            'items_summary'       => json_encode($itemsWithDelivered),
            'is_split_order'      => false,
            'batch_items'         => $batchItems,
        ]);

        $this->notifyOrderPlaced($order);

        return response()->json([
            'status'       => true,
            'message'      => 'Order placed successfully.',
            'warehouse'    => $warehouse,
            'order'        => $order,
            'delivery_fee' => $deliveryFee,
            'distance_km'  => $distanceKm,
        ], 201);
    }

    /*─────────────────────────────────────────────
     | CLIENT: place partial / reserved order
     | Nearest warehouse only
     ─────────────────────────────────────────────*/
    public function storePartial(Request $request)
    {
        $user = Auth::user();
        if (!$user->latitude || !$user->longitude) {
            return response()->json(['status' => false, 'message' => 'Please set your delivery location first.'], 422);
        }

        $request->validate([
            'items'               => 'required|string',
            'total_quantity'      => 'required|integer|min:20',
            'total_empty_returns' => 'nullable|integer|min:0',
            'total_cost'          => 'required|numeric',
            'payment_receipt'     => 'required|file|mimes:jpeg,png,jpg,pdf|max:4096',
            'available_qty'       => 'required|integer|min:0',
        ]);

        $orderItems   = json_decode($request->items, true);
        $totalQty     = (int) $request->total_quantity;
        $availableQty = (int) $request->available_qty;
        $pendingQty   = $totalQty - $availableQty;
        $totalReturns = (int) ($request->total_empty_returns ?? 0);

        // Per-item max check
        foreach (($orderItems ?? []) as $item) {
            if ((int)($item['quantity'] ?? 0) > 100) {
                return response()->json(['status' => false, 'message' => "Maximum is 100 cylinders per cylinder type."], 422);
            }
        }
        $cylinderCost = (float) $request->total_cost;
        $receiptPath  = $request->file('payment_receipt')->store('receipts', 'public');
        $userLat      = (float) $user->latitude;
        $userLng      = (float) $user->longitude;

        // Resolve nearest warehouse (include zero-stock for OOS reservations)
        $warehouseId = $request->warehouse_id ?? null;
        if ($warehouseId) {
            $warehouse = Warehouse::find($warehouseId);
        } else {
            $warehouse = null; $best = null;
            foreach (Warehouse::where('status', true)->get() as $w) {
                if (!$w->latitude || !$w->longitude) continue;
                $dist = $this->haversine($userLat, $userLng, (float)$w->latitude, (float)$w->longitude);
                if ($best === null || $dist < $best) { $best = $dist; $warehouse = $w; }
            }
        }

        // Resolve nearest warehouse using selection logic
        $warehouseId = $request->warehouse_id ?? null;
        if ($warehouseId) {
            $warehouse = Warehouse::find($warehouseId);
        } else {
            $result = $this->pickWarehouseForOrder($userLat, $userLng, $orderItems);
            if ($result['needs_user_choice']) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Multiple warehouses matched equally. Please select one.',
                ], 422);
            }
            $warehouse = $result['nearest'];
        }

        if (!$warehouse) return response()->json(['status' => false, 'message' => 'No active warehouse found.'], 422);

        $distanceKm  = $this->haversine($userLat, $userLng, (float)$warehouse->latitude, (float)$warehouse->longitude);
        $deliveryFee = max(100, round($distanceKm) * 100 + 100);
        $partialCost = $availableQty > 0 ? round(($availableQty / $totalQty) * $cylinderCost, 2) : $cylinderCost;
        $totalAmount = $partialCost + $deliveryFee;

        // The order quantity stored — total_quantity ALWAYS = full requested amount
        // remaining_quantity = what's available NOW for first batch
        $orderQtyNow   = $availableQty > 0 ? $availableQty : $totalQty;
        $remainingQty  = $orderQtyNow; // first batch size
        $orderType     = $availableQty === 0 ? 'PRE_ORDER' : ($pendingQty > 0 ? 'PARTIAL_PENDING' : 'NORMAL');
        $partialStatus = $pendingQty > 0 ? ($availableQty === 0 ? 'PRE_ORDER' : 'PARTIAL_CONFIRMED') : null;

        // Map items to include delivered_qty
        $itemsWithDelivered = array_map(function ($item) {
            $item['delivered_qty'] = 0;
            return $item;
        }, $orderItems);

        // Group requested quantities by cylinder_type_id
        $requestedByType = [];
        foreach ($orderItems as $item) {
            $typeId = (int)($item['cylinder_type_id'] ?? 0);
            $qty    = (int)($item['quantity'] ?? 0);
            $requestedByType[$typeId] = ($requestedByType[$typeId] ?? 0) + $qty;
        }

        $batchItems = [];
        foreach ($requestedByType as $typeId => $requestedQty) {
            $availableForType = (int) WarehouseStock::where('warehouse_id', $warehouse->id)
                ->where('cylinder_type_id', $typeId)
                ->sum('quantity');
            $available = min($availableForType, $requestedQty);
            if ($available > 0) {
                $batchItems[] = [
                    'cylinder_type_id' => $typeId,
                    'quantity'         => $available,
                ];
            }
        }

        $order = DB::transaction(function () use (
            $user, $warehouse, $itemsWithDelivered, $batchItems, $totalQty, $availableQty, $pendingQty,
            $orderQtyNow, $remainingQty, $totalReturns, $totalAmount, $receiptPath,
            $partialStatus, $orderType
        ) {
            return Order::create([
                'user_id'             => $user->id,
                'warehouse_id'        => $warehouse->id,
                'order_number'        => 'ORD-' . strtoupper(uniqid()),
                'total_quantity'      => $totalQty,      // ← ALWAYS the full requested amount
                'requested_quantity'  => $totalQty,      // ← same
                'delivered_quantity'  => 0,
                'pending_quantity'    => $pendingQty,
                'remaining_quantity'  => $remainingQty,  // ← first batch size
                'total_empty_returns' => $totalReturns,
                'total_amount'        => $totalAmount,
                'receipt_path'        => $receiptPath,
                'status'              => 'Pending',
                'order_type'          => $orderType,
                'partial_status'      => $partialStatus,
                'auto_reserve'        => true,
                'items_summary'       => json_encode($itemsWithDelivered),
                'is_split_order'      => false,
                'batch_items'         => $availableQty === 0 ? null : $batchItems,
            ]);
        });

        $this->notifyOrderPlaced($order);

        $message = $availableQty === 0
            ? "Order reserved! All {$totalQty} cylinders will be auto-delivered as stock arrives."
            : "Order placed! Delivering {$availableQty} cylinders now. Remaining {$pendingQty} will be auto-delivered as stock arrives.";

        return response()->json([
            'status'         => true,
            'message'        => $message,
            'warehouse'      => $warehouse,
            'order'          => $order,
            'delivery_fee'   => $deliveryFee,
            'distance_km'    => $distanceKm,
            'available_qty'  => $availableQty,
            'pending_qty'    => $pendingQty,
            'partial_status' => $partialStatus,
        ], 201);
    }

    // ── Notify + manager/admin of this warehouse ──
    private function notifyOrderPlaced(Order $order): void
    {
        $order->loadMissing(['user', 'warehouse']);
        $data = ['id' => $order->id, 'order_number' => $order->order_number,
                 'total_quantity' => $order->total_quantity, 'total_amount' => $order->total_amount];
        $clientName    = $order->user?->name    ?? 'Client';
        $warehouseName = $order->warehouse?->name ?? 'Warehouse';
        $notif = new OrderPlaced($data, $clientName, $warehouseName);

        // Notify client
        $order->user?->notify($notif);

        // Notify managers of this warehouse
        User::where('role', 'manager')->where('warehouse_id', $order->warehouse_id)
            ->where('status', true)->get()->each(fn ($m) => $m->notify($notif));

        // Notify admins
        User::where('role', 'admin')->where('status', true)->get()
            ->each(fn ($a) => $a->notify($notif));
    }

    // ── Notify client + relevant staff of status change ──
    private function notifyStatusChange(Order $order, string $status): void
    {
        $order->loadMissing(['user', 'warehouse']);
        $data = ['id' => $order->id, 'order_number' => $order->order_number];
        $notif = new OrderStatusChanged($data, $status, $order->warehouse?->name ?? '');

        // Always notify the client
        $order->user?->notify($notif);

        // Notify managers of this warehouse
        User::where('role', 'manager')->where('warehouse_id', $order->warehouse_id)
            ->where('status', true)->get()->each(fn ($m) => $m->notify($notif));
    }

    /*─────────────────────────────────────────────
     | CLIENT: cancel order
     ─────────────────────────────────────────────*/
    public function cancel(Request $request, $id)
    {
        $order = Order::where('id', $id)->where('user_id', Auth::id())->firstOrFail();

        if (!in_array($order->status, ['Pending', 'Approved'])) {
            return response()->json([
                'status'  => false,
                'message' => 'Only Pending or Approved orders can be cancelled.',
            ], 422);
        }

        // Block cancellation if already Refund Pending or Refunded
        if (in_array($order->payment_status, ['Refund Pending', 'Refunded'])) {
            return response()->json([
                'status'  => false,
                'message' => 'This order already has a refund in progress.',
            ], 422);
        }

        $reason = $request->input('cancellation_reason', 'Cancelled by client.');

        // If payment was verified (Approved or beyond Pending) → trigger refund flow
        $paymentVerified = $order->payment_status === 'Verified'
            || $order->status === 'Approved';

        if ($paymentVerified) {
            // Return stock if order was Approved
            if ($order->status === 'Approved') {
                $this->returnStockOnReject($order, Auth::id());
            }

            $order->update([
                'status'              => 'Cancelled',
                'payment_status'      => 'Refund Pending',
                'cancellation_reason' => $reason,
                'cancelled_at'        => now(),
            ]);

            // Notify client — refund pending
            $order->user?->notify(new \App\Notifications\RefundStatusChanged(
                order: [
                    'id'           => $order->id,
                    'order_number' => $order->order_number,
                    'total_amount' => $order->total_amount,
                ],
                refundStatus: 'Refund Pending',
            ));

        } else {
            // No payment verified — simple cancel, no refund needed
            $order->update([
                'status'              => 'Cancelled',
                'payment_status'      => 'Pending',
                'cancellation_reason' => $reason,
                'cancelled_at'        => now(),
            ]);
        }

        // Status changed notification
        $this->notifyStatusChange($order, 'Cancelled');

        return response()->json([
            'status'          => true,
            'message'         => $paymentVerified
                ? 'Order cancelled. A refund will be processed by the admin.'
                : 'Order cancelled successfully.',
            'order'           => $order->fresh(),
            'refund_required' => $paymentVerified,
        ]);
    }

    /*─────────────────────────────────────────────
     | ADMIN/MANAGER: mark payment as Verified
     ─────────────────────────────────────────────*/
    public function verifyPayment($id)
    {
        $order = Order::findOrFail($id);

        if ($order->payment_status === 'Verified') {
            return response()->json(['status' => false, 'message' => 'Payment already verified.'], 422);
        }

        $order->update(['payment_status' => 'Verified']);

        return response()->json(['status' => true, 'message' => 'Payment verified.', 'order' => $order]);
    }

    /*─────────────────────────────────────────────
     | CLIENT: upload / replace payment receipt
     ─────────────────────────────────────────────*/
    public function uploadPayment(Request $request, $id)
    {
        $request->validate(['payment_receipt' => 'required|file|mimes:jpeg,png,jpg,pdf|max:4096']);

        $order = Order::where('id', $id)->where('user_id', Auth::id())->firstOrFail();
        $path  = $request->file('payment_receipt')->store('receipts', 'public');

        $order->update(['receipt_path' => $path, 'payment_receipt' => $path]);

        return response()->json(['status' => true, 'message' => 'Receipt uploaded.', 'order' => $order]);
    }

    /*─────────────────────────────────────────────
     | ADMIN: approve / reject / assign driver
     ─────────────────────────────────────────────*/
    public function approve($id)
    {
        $order = Order::findOrFail($id);

        // ── Pre-approval: verify stock is available for each cylinder type ──
        $items = is_array($order->items_summary)
            ? $order->items_summary
            : json_decode($order->items_summary ?? '[]', true);

        if ($items && is_array($items)) {
            foreach ($items as $item) {
                $qty            = (int)($item['quantity'] ?? 0);
                $cylinderTypeId = $item['cylinder_type_id'] ?? null;
                if ($qty <= 0 || !$cylinderTypeId) continue;

                $available = (int) WarehouseStock::where('warehouse_id', $order->warehouse_id)
                    ->where('cylinder_type_id', $cylinderTypeId)
                    ->sum('quantity');

                if ($available <= 0) {
                    $typeName = \App\Models\CylinderType::find($cylinderTypeId)?->name ?? "Type #{$cylinderTypeId}";
                    return response()->json([
                        'status'  => false,
                        'message' => "Cannot approve: {$typeName} is out of stock.",
                    ], 422);
                }
            }
        }

        $this->deductStockOnApproval($order, Auth::id());
        $order->update([
            'status'         => 'Approved',
            'payment_status' => 'Verified',
        ]);
        \App\Services\StockAlertService::checkAfterDeduction($order->warehouse_id);
        $this->notifyStatusChange($order, 'Approved');
        return response()->json(['status' => true, 'order' => $order]);
    }

    public function reject($id)
    {
        $order = Order::findOrFail($id);
        // If order was Approved (stock reserved), return stock on rejection
        if ($order->status === 'Approved') {
            $this->returnStockOnReject($order, Auth::id());
        }
        $order->update(['status' => 'Rejected']);
        $this->notifyStatusChange($order, 'Rejected');
        return response()->json(['status' => true, 'order' => $order]);
    }

    /*─────────────────────────────────────────────
     | PRIVATE: Deduct stock when order is approved
     ─────────────────────────────────────────────*/
    private function deductStockOnApproval(Order $order, int $userId): void
    {
        if (!$order->warehouse_id) return;

        $items = is_array($order->items_summary)
            ? $order->items_summary
            : json_decode($order->items_summary ?? '[]', true);

        DB::transaction(function () use ($order, $items, $userId) {
            if ($items && is_array($items)) {
                foreach ($items as $item) {
                    $qty            = (int)($item['quantity'] ?? 0);
                    $cylinderTypeId = $item['cylinder_type_id'] ?? null;
                    if ($qty <= 0 || !$cylinderTypeId) continue;

                    // Pessimistic lock — prevents concurrent double deduction
                    $stock = WarehouseStock::where('warehouse_id', $order->warehouse_id)
                        ->where('cylinder_type_id', $cylinderTypeId)
                        ->lockForUpdate()
                        ->first();

                    if ($stock && $stock->quantity > 0) {
                        $deduct = min($qty, $stock->quantity);
                        $stock->decrement('quantity', $deduct);
                        \App\Models\StockHistory::create([
                            'warehouse_id'     => $order->warehouse_id,
                            'cylinder_type_id' => $cylinderTypeId,
                            'order_id'         => $order->id,
                            'user_id'          => $userId,
                            'type'             => 'out',
                            'quantity'         => $deduct,
                            'note'             => "Order #{$order->order_number} approved — stock reserved",
                        ]);
                    }
                }
            } else {
                $batchQty = $order->remaining_quantity > 0 ? $order->remaining_quantity : $order->total_quantity;
                $stocks   = WarehouseStock::where('warehouse_id', $order->warehouse_id)
                    ->where('quantity', '>', 0)->orderByDesc('quantity')->lockForUpdate()->get();
                $rem = $batchQty;
                foreach ($stocks as $stock) {
                    if ($rem <= 0) break;
                    $d = min($rem, $stock->quantity);
                    $stock->decrement('quantity', $d);
                    $rem -= $d;
                    \App\Models\StockHistory::create([
                        'warehouse_id'     => $order->warehouse_id,
                        'cylinder_type_id' => $stock->cylinder_type_id,
                        'order_id'         => $order->id,
                        'user_id'          => $userId,
                        'type'             => 'out',
                        'quantity'         => $d,
                        'note'             => "Order #{$order->order_number} approved — stock reserved (fallback)",
                    ]);
                }
            }
        });
    }

    /*─────────────────────────────────────────────
     | PRIVATE: Return stock when Approved order is rejected
     ─────────────────────────────────────────────*/
    private function returnStockOnReject(Order $order, int $userId): void
    {
        if (!$order->warehouse_id) return;

        $items = is_array($order->items_summary)
            ? $order->items_summary
            : json_decode($order->items_summary ?? '[]', true);

        if ($items && is_array($items)) {
            foreach ($items as $item) {
                $qty            = (int)($item['quantity'] ?? 0);
                $cylinderTypeId = $item['cylinder_type_id'] ?? null;
                if ($qty <= 0 || !$cylinderTypeId) continue;

                $stock = WarehouseStock::where('warehouse_id', $order->warehouse_id)
                    ->where('cylinder_type_id', $cylinderTypeId)->first();

                if ($stock) {
                    $stock->increment('quantity', $qty);
                } else {
                    WarehouseStock::create([
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
                    'note'             => "Order #{$order->order_number} rejected — stock returned",
                ]);
            }
        }
    }

    public function assignDriver(Request $request, $id)
    {
        $request->validate(['driver_id' => 'required|exists:users,id']);

        $driver = User::findOrFail($request->driver_id);
        if ($driver->role !== 'driver') {
            return response()->json(['status' => false, 'message' => 'Selected user is not a driver.'], 422);
        }

        $order = Order::findOrFail($id);

        // ── Driver load capacity check ────────────────────────────
        // Calculate live from active Out-for-Delivery orders (never stale)
        $liveLoad = (int) Order::where('assigned_driver_id', $driver->id)
            ->where('status', 'Out for Delivery')
            ->sum('total_quantity');

        // Sync the cached field while we're here
        $driver->update(['driver_current_load' => $liveLoad]);

        $newLoad = $liveLoad + $order->total_quantity;
        if ($newLoad > $driver->driver_max_capacity) {
            $available = $driver->driver_max_capacity - $liveLoad;
            return response()->json([
                'status'  => false,
                'message' => "Driver is at capacity. Active load: {$liveLoad}/{$driver->driver_max_capacity}. "
                           . "This order needs {$order->total_quantity} cylinders but only {$available} space remaining.",
                'current_load'   => $liveLoad,
                'max_capacity'   => $driver->driver_max_capacity,
                'order_quantity' => $order->total_quantity,
                'available'      => max(0, $available),
            ], 422);
        }

        $order->update([
            'assigned_driver_id' => $request->driver_id,
            'status'             => 'Out for Delivery',
        ]);

        // Update cached load
        $driver->increment('driver_current_load', $order->total_quantity);

        $this->notifyStatusChange($order, 'Out for Delivery');

        return response()->json([
            'status'       => true,
            'message'      => 'Driver assigned.',
            'order'        => $order,
            'driver_load'  => $driver->fresh()->driver_current_load,
            'driver_capacity' => $driver->driver_max_capacity,
        ]);
    }

    /*─────────────────────────────────────────────
     | PRIVATE: warehouse selection with full
     |   tie-break (distance → stock → busy)
     ─────────────────────────────────────────────*/
    /**
     * Resolves the warehouse candidates based on location and items stock.
     */
    private function pickWarehouseForOrder(float $lat, float $lng, ?array $items = null): array
    {
        $warehouses = Warehouse::where('status', true)->get();
        $candidates = [];

        foreach ($warehouses as $wh) {
            if (!$wh->latitude || !$wh->longitude) continue;

            $hasSufficientStock = true;
            if ($items && is_array($items)) {
                foreach ($items as $item) {
                    $cylinderTypeId = $item['cylinder_type_id'] ?? null;
                    $qty            = (int) ($item['quantity'] ?? 0);
                    if ($qty <= 0 || !$cylinderTypeId) continue;

                    $available = (int) WarehouseStock::where('warehouse_id', $wh->id)
                        ->where('cylinder_type_id', $cylinderTypeId)
                        ->sum('quantity');

                    if ($available < $qty) {
                        $hasSufficientStock = false;
                        break;
                    }
                }
            }

            $distance = $this->haversine($lat, $lng, (float)$wh->latitude, (float)$wh->longitude);

            $activeOrders = Order::where('warehouse_id', $wh->id)
                ->whereIn('status', ['Pending', 'Approved', 'Assigned', 'In Progress', 'Partially Delivered', 'Out for Delivery'])
                ->count();

            $candidates[] = [
                'warehouse'            => $wh,
                'distance_km'          => $distance,
                'active_orders'        => $activeOrders,
                'has_sufficient_stock' => $hasSufficientStock,
            ];
        }

        if (empty($candidates)) {
            return [
                'needs_user_choice' => false,
                'nearest'           => null,
                'candidates'        => [],
            ];
        }

        // Rule: Consider only warehouses that have sufficient stock.
        // If there are warehouses with sufficient stock, filter to only those.
        // Otherwise (fallback to allow pre-order/partial delivery), consider all warehouses.
        $sufficientStockCandidates = array_filter($candidates, fn($c) => $c['has_sufficient_stock']);
        if (!empty($sufficientStockCandidates)) {
            $filteredCandidates = array_values($sufficientStockCandidates);
        } else {
            $filteredCandidates = $candidates;
        }

        // Sort by distance (ASC), then workload (active_orders ASC)
        usort($filteredCandidates, function ($a, $b) {
            if ($a['distance_km'] !== $b['distance_km']) {
                return $a['distance_km'] <=> $b['distance_km'];
            }
            return $a['active_orders'] <=> $b['active_orders'];
        });

        $top = $filteredCandidates[0];

        // Find all candidates that are tied on BOTH distance AND workload
        $tied = array_filter($filteredCandidates, fn($c) =>
            $c['distance_km']   === $top['distance_km'] &&
            $c['active_orders'] === $top['active_orders']
        );

        if (count($tied) > 1) {
            return [
                'needs_user_choice' => true,
                'nearest'           => null,
                'candidates'        => array_map(fn($c) => [
                    'id'            => $c['warehouse']->id,
                    'name'          => $c['warehouse']->name,
                    'address'       => $c['warehouse']->address,
                    'latitude'      => $c['warehouse']->latitude,
                    'longitude'     => $c['warehouse']->longitude,
                    'distance_km'   => $c['distance_km'],
                    'active_orders' => $c['active_orders'],
                    'stock'         => (int) WarehouseStock::where('warehouse_id', $c['warehouse']->id)->sum('quantity'),
                ], array_values($tied)),
            ];
        }

        return [
            'needs_user_choice' => false,
            'nearest'           => $top['warehouse'],
            'candidates'        => [],
        ];
    }

    private function pickNearestWarehouse(float $lat, float $lng, int $qty): ?Warehouse
    {
        $result = $this->pickWarehouseForOrder($lat, $lng, null);
        return $result['nearest'] ?? ($result['candidates'][0]['warehouse'] ?? null);
    }

    /*─────────────────────────────────────────────
     | PRIVATE: Haversine great-circle distance
     ─────────────────────────────────────────────*/
    private function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);
        $a    = sin($dLat/2)**2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon/2)**2;
        return round($R * 2 * atan2(sqrt($a), sqrt(1-$a)), 2);
    }
}
