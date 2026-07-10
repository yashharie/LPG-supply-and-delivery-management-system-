<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use Illuminate\Http\Request;

class BrandController extends Controller
{
    public function index()
    {
        return response()->json(Brand::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:brands,name'
        ]);

        $brand = Brand::create([
            'name' => $request->name
        ]);

        return response()->json($brand, 201);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);

        $request->validate([
            'name' => 'required|string|unique:brands,name,' . $id
        ]);

        $brand->update([
            'name' => $request->name
        ]);

        return response()->json($brand);
    }

    public function destroy($id)
    {
        Brand::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Brand deleted successfully'
        ]);
    }
}