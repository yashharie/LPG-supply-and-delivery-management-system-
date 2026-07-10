<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class PortalAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'role' => 'required|string',
            'user_id' => 'required|string',
            'password' => 'required|string',
        ]);

        $role = strtolower(trim($request->role));
        $input = trim($request->user_id);

        // -------------------------
        // ADMIN LOGIN
        // -------------------------
        if ($role === 'admin') {
            $user = User::where('role', 'admin')
                ->where(function ($q) use ($input) {
                    $q->where('email', $input)
                      ->orWhere('employee_id', $input);
                })
                ->first();
        } else {
            // -------------------------
            // EMPLOYEE / MANAGER / DRIVER LOGIN
            // -------------------------
            $user = User::where('employee_id', $input)
                ->where('role', $role)
                ->first();
        }

        if (!$user) {
            return response()->json([
                'message' => 'User account footprint not detected in system indices.'
            ], 404);
        }

        // ✨ Compares using clean input values
        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid password'
            ], 401);
        }

        if (!$user->status) {
            return response()->json([
                'message' => 'Account inactive'
            ], 403);
        }

        // Generate standard sanctum plain text authentication key string
        $token = $user->createToken('portal_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'employee_id' => $user->employee_id,
                'name' => $user->name,
                'role' => $user->role,
                'must_change_password' => $user->must_change_password
            ]
        ]);
    }
}