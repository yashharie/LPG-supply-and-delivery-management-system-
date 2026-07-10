<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\User;
use App\Models\WarehouseStock;
use App\Models\StockHistory;
use App\Notifications\OrderStatusChanged;
use App\Services\StockAlertService;
use Illuminate\Support\Facades\DB;

class DriverDashboardController extends Controller
{
    public function index(Request $request)
    {
        $driver = $request->user()->load('warehouse');

        $active = Order::where('assigned_driver_id', $driver->id)
            ->whereIn('status', ['Out for Delivery'])
            ->with('user', 'warehouse')
            ->latest()->get();

        $completed = Order::where('assigned_driver_id', $driver->id)
            ->where('status', 'Delivered')
            ->with('user', 'warehouse')
            ->latest()->take(20)->get();

        return response()->json([
            'driver'    => $driver,
            'active'    => $active,
            'completed' => $completed,
            'stats'     => [
                'total_deliveries'     => Order::where('assigned_driver_id', $driver->id)->count(),
                'active_deliveries'    => $active->count(),
                'completed_deliveries' => Order::where('assigned_driver_id', $driver->id)
                                            ->where('status', 'Delivered')->count(),
            ],
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:Out for Delivery,Delivered',
        ]);

        $order = Order::findOrFail($id);

        if ((int)$order->assigned_driver_id !== (int)$request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->status === 'Delivered' && $order->status !== 'Delivered') {
            // Stock was already deducted at approval — no need to deduct again.
            // Just release driver capacity and send notifications.

            $driver = $request->user();
            $releaseQty = min($order->total_quantity, $driver->driver_current_load);
            if ($releaseQty > 0) {
                $driver->decrement('driver_current_load', $releaseQty);
            }

            $order->user?->notify(new OrderStatusChanged(
                ['id' => $order->id, 'order_number' => $order->order_number],
                'Delivered'
            ));

            if ($order->warehouse_id) {
                StockAlertService::checkAfterDeduction($order->warehouse_id);
            }
        }

        $order->update(['status' => $request->status]);

        return response()->json(['status' => true, 'message' => 'Status updated.', 'order' => $order]);
    }

    public function updateLocation(Request $request)
    {
        $request->validate(['lat' => 'required|numeric', 'lng' => 'required|numeric']);

        $request->user()->update([
            'driver_lat'                 => $request->lat,
            'driver_lng'                 => $request->lng,
            'driver_location_updated_at' => now(),
        ]);

        return response()->json(['status' => true]);
    }

    public function getLocation($id)
    {
        $driver = User::where('id', $id)->where('role', 'driver')->firstOrFail();

        return response()->json([
            'driver_id'  => $driver->id,
            'name'       => $driver->name,
            'lat'        => $driver->driver_lat,
            'lng'        => $driver->driver_lng,
            'updated_at' => $driver->driver_location_updated_at,
        ]);
    }
}
