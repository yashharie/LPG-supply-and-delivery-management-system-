<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminEmployeeController extends Controller
{
    public function index()
    {
        return response()->json(
            User::whereIn('role', ['employee', 'manager', 'driver'])
                ->with('warehouse')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'         => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
            'nic'          => 'required|string|unique:users,nic',
            'role'         => 'required|in:employee,manager,driver',
            'warehouse_id' => 'nullable|exists:warehouses,id',
        ], [
            'name.regex' => 'Name must contain letters only (no numbers or symbols).',
        ]);

        $prefix = match ($request->role) {
            'manager' => 'MGR',
            'driver'  => 'DRV',
            default   => 'EMP',
        };

        $count      = User::where('role', $request->role)->count() + 1;
        $employeeId = $prefix . str_pad($count, 3, '0', STR_PAD_LEFT);
        $password   = '123456';

        $employee = User::create([
            'employee_id'          => $employeeId,
            'name'                 => $request->name,
            'nic'                  => $request->nic,
            'email'                => $employeeId . '@gashub.local',
            'password'             => Hash::make($password),
            'role'                 => $request->role,
            'warehouse_id'         => $request->warehouse_id,
            'must_change_password' => true,
            'status'               => true,
        ]);

        return response()->json([
            'message'          => 'Employee created',
            'employee_id'      => $employeeId,
            'default_password' => $password,
            'employee'         => $employee->load('warehouse'),
        ], 201);
    }

    public function show($id)
    {
        return response()->json(User::with('warehouse')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $employee = User::findOrFail($id);

        $request->validate([
            'name'         => 'sometimes|string|max:255',
            'role'         => 'sometimes|in:employee,manager,driver',
            'status'       => 'sometimes|boolean',
            'warehouse_id' => 'nullable|exists:warehouses,id',
        ]);

        $employee->update([
            'name'         => $request->name         ?? $employee->name,
            'role'         => $request->role         ?? $employee->role,
            'status'       => $request->status       ?? $employee->status,
            'warehouse_id' => $request->has('warehouse_id') ? $request->warehouse_id : $employee->warehouse_id,
        ]);

        return response()->json(['message' => 'Updated', 'employee' => $employee->load('warehouse')]);
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
