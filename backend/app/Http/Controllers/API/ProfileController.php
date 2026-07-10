<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'phone'     => 'required|string|max:20',
            'address'   => 'required|string|max:500',
            'latitude'  => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['status' => false, 'errors' => $validator->errors()], 422);
        }

        // ── Check if location is changing AND user has an active order
        $locationChanging =
            round((float)$request->latitude,  5) !== round((float)$user->latitude,  5) ||
            round((float)$request->longitude, 5) !== round((float)$user->longitude, 5);

        if ($locationChanging && $user->latitude && $user->longitude) {
            $hasActiveOrder = Order::where('user_id', $user->id)
                ->whereIn('status', ['Pending', 'Approved', 'Out for Delivery'])
                ->exists();

            if ($hasActiveOrder) {
                return response()->json([
                    'status'  => false,
                    'message' => 'You cannot change your delivery location while you have an active order in progress. Please wait until your current order is completed or cancelled.',
                ], 422);
            }
        }

        $user->update([
            'phone'     => $request->phone,
            'address'   => $request->address,
            'latitude'  => $request->latitude,
            'longitude' => $request->longitude,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Profile updated successfully.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * Returns whether the current user has active orders
     * (used by frontend to decide if location can be changed)
     */
    public function checkActiveOrders()
    {
        $user = Auth::user();
        $hasActive = Order::where('user_id', $user->id)
            ->whereIn('status', ['Pending', 'Approved', 'Out for Delivery'])
            ->exists();

        return response()->json(['has_active_orders' => $hasActive]);
    }
}
