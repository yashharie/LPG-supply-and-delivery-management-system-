<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WarehouseStock;

class EmployeeDashboardController extends Controller
{
    public function index(Request $request)
    {
        $employee = $request->user()->load('warehouse');

        // Load stock for their assigned warehouse
        $stock = [];
        if ($employee->warehouse_id) {
            $stock = WarehouseStock::with(['cylinderType.brand'])
                ->where('warehouse_id', $employee->warehouse_id)
                ->get();
        }

        return response()->json([
            'message'  => 'Employee dashboard loaded',
            'employee' => $employee,
            'stock'    => $stock,
        ]);
    }
}
