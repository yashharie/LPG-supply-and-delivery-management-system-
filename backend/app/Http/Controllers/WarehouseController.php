<?php

namespace App\Http\Controllers;

use App\Models\Warehouse;
use App\Models\WarehouseStock;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    /*──────────────────────────────────────────
     | List all warehouses (all authenticated)
     ──────────────────────────────────────────*/
    public function index()
    {
        return response()->json(Warehouse::all());
    }

    /*──────────────────────────────────────────
     | Create warehouse (admin only via route)
     ──────────────────────────────────────────*/
    public function store(Request $request)
    {
        $request->validate([
            'name'      => 'required|string|max:255',
            'address'   => 'required|string|max:500',
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
            'capacity'  => 'required|integer|min:1',
        ]);

        $warehouse = Warehouse::create([
            'name'          => $request->name,
            'address'       => $request->address,
            'latitude'      => $request->latitude,
            'longitude'     => $request->longitude,
            'capacity'      => $request->capacity,
            'current_stock' => 0,
            'status'        => true,
        ]);

        return response()->json([
            'status'    => true,
            'message'   => 'Warehouse created.',
            'warehouse' => $warehouse,
        ], 201);
    }

    /*──────────────────────────────────────────
     | Show single warehouse
     ──────────────────────────────────────────*/
    public function show($id)
    {
        $warehouse = Warehouse::with('stocks.cylinderType')->findOrFail($id);
        return response()->json($warehouse);
    }

    /*──────────────────────────────────────────
     | Update warehouse (admin only)
     ──────────────────────────────────────────*/
    public function update(Request $request, $id)
    {
        $warehouse = Warehouse::findOrFail($id);

        $request->validate([
            'name'      => 'sometimes|string|max:255',
            'address'   => 'sometimes|string|max:500',
            'latitude'  => 'sometimes|numeric',
            'longitude' => 'sometimes|numeric',
            'capacity'  => 'sometimes|integer|min:1',
            'status'    => 'sometimes|boolean',
        ]);

        $warehouse->update($request->only(['name','address','latitude','longitude','capacity','status']));

        return response()->json(['status' => true, 'warehouse' => $warehouse]);
    }

    /*──────────────────────────────────────────
     | Delete warehouse (admin only)
     ──────────────────────────────────────────*/
    public function destroy($id)
    {
        Warehouse::findOrFail($id)->delete();
        return response()->json(['status' => true, 'message' => 'Warehouse deleted.']);
    }
}
