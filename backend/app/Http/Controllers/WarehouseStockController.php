<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WarehouseStock;
use App\Models\StockHistory;
use App\Services\StockAlertService;
use Illuminate\Support\Facades\Auth;

class WarehouseStockController extends Controller
{
    public function index()
    {
        return WarehouseStock::with(['warehouse', 'cylinderType.brand'])->get();
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'manager') {
            $warehouseId = $user->warehouse_id;
            if (!$warehouseId) {
                return response()->json(['status' => false, 'message' => 'You do not have an assigned warehouse.'], 403);
            }
            $request->merge(['warehouse_id' => $warehouseId]);
        }

        $request->validate([
            'warehouse_id'     => 'required|exists:warehouses,id',
            'cylinder_type_id' => 'required|exists:cylinder_types,id',
            'quantity'         => 'required|integer|min:1',
        ]);

        // ── Capacity check ──────────────────────────────────────
        $warehouse    = \App\Models\Warehouse::findOrFail($request->warehouse_id);
        $currentTotal = WarehouseStock::where('warehouse_id', $request->warehouse_id)
                            ->sum('quantity');
        $available    = $warehouse->capacity - $currentTotal;

        if ($request->quantity > $available) {
            return response()->json([
                'status'  => false,
                'message' => "Cannot add {$request->quantity} cylinders. Warehouse capacity is {$warehouse->capacity}. " .
                             "Currently holds {$currentTotal}. Only {$available} space remaining.",
            ], 422);
        }
        // ────────────────────────────────────────────────────────

        // Upsert: add to existing row or create new one
        $stock = WarehouseStock::where('warehouse_id', $request->warehouse_id)
            ->where('cylinder_type_id', $request->cylinder_type_id)
            ->first();

        if ($stock) {
            $stock->increment('quantity', $request->quantity);
        } else {
            $stock = WarehouseStock::create([
                'warehouse_id'     => $request->warehouse_id,
                'cylinder_type_id' => $request->cylinder_type_id,
                'quantity'         => $request->quantity,
            ]);
        }

        // Record stock-in history
        StockHistory::create([
            'warehouse_id'     => $request->warehouse_id,
            'cylinder_type_id' => $request->cylinder_type_id,
            'user_id'          => Auth::id(),
            'type'             => 'in',
            'quantity'         => $request->quantity,
            'note'             => $request->note ?? 'Manual stock replenishment',
        ]);

        // ── Auto-fulfillment: check if any reserved partial orders can now be fulfilled ──
        \App\Services\StockAlertService::autoFulfillPendingOrders($request->warehouse_id);

        return response()->json(['status' => true, 'stock' => $stock->fresh()->load('cylinderType.brand')]);
    }

    public function update(Request $request, $id)
    {
        $stock = WarehouseStock::findOrFail($id);

        $request->validate(['quantity' => 'required|integer|min:0']);

        $diff = $request->quantity - $stock->quantity;
        $stock->update(['quantity' => $request->quantity]);

        if ($diff !== 0) {
            StockHistory::create([
                'warehouse_id'     => $stock->warehouse_id,
                'cylinder_type_id' => $stock->cylinder_type_id,
                'user_id'          => Auth::id(),
                'type'             => $diff > 0 ? 'in' : 'out',
                'quantity'         => abs($diff),
                'note'             => 'Manual stock adjustment',
            ]);
        }

        return response()->json($stock);
    }

    public function destroy(Request $request, $id)
    {
        $stock = WarehouseStock::findOrFail($id);
        $user = $request->user();
        if ($user->role === 'manager' && $stock->warehouse_id !== $user->warehouse_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $stock->delete();
        return response()->json(['message' => 'Stock entry deleted']);
    }
}
