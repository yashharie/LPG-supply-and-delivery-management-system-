<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class EmployeePasswordController extends Controller
{
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect'
            ], 401);
        }

        $user->password = Hash::make($request->new_password);
        $user->must_change_password = 0;
        $user->save();

        return response()->json([
            'message' => 'Password updated successfully'
        ]);
    }
}