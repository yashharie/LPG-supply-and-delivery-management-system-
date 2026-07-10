<?php

namespace App\Http\Controllers;

use App\Models\CylinderType;
use Illuminate\Http\Request;

class CylinderTypeController extends Controller
{
    public function index()
    {
        return response()->json(
            CylinderType::with('brand')->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'name' => 'required|string',
            'weight' => 'required|numeric',
            'price' => 'required|numeric'
        ]);

        $type = CylinderType::create([
            'brand_id' => $request->brand_id,
            'name' => $request->name,
            'weight' => $request->weight,
            'price' => $request->price
        ]);

        return response()->json($type, 201);
    }

    public function update(Request $request, $id)
    {
        $type = CylinderType::findOrFail($id);

        $request->validate([
            'brand_id' => 'required|exists:brands,id',
            'name' => 'required|string',
            'weight' => 'required|numeric',
            'price' => 'required|numeric'
        ]);

        $type->update([
            'brand_id' => $request->brand_id,
            'name' => $request->name,
            'weight' => $request->weight,
            'price' => $request->price
        ]);

        return response()->json($type);
    }

    public function destroy($id)
    {
        CylinderType::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Cylinder type deleted successfully'
        ]);
    }
}