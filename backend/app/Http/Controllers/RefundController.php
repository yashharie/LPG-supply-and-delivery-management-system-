<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Notifications\RefundStatusChanged;
use Illuminate\Support\Facades\Auth;

class RefundController extends Controller
{
    /*─────────────────────────────────────────────
     | ADMIN: List all orders with Refund Pending
     ─────────────────────────────────────────────*/
    public function index()
    {
        $orders = Order::with(['user', 'warehouse', 'refundedBy'])
            ->where('payment_status', 'Refund Pending')
            ->orWhere('payment_status', 'Refunded')
            ->latest()
            ->get()
            ->map(fn ($o) => $this->formatOrder($o));

        return response()->json($orders);
    }

    /*─────────────────────────────────────────────
     | ADMIN: Mark order as Refunded
     ─────────────────────────────────────────────*/
    public function markRefunded(Request $request, $id)
    {
        $request->validate([
            'refund_notes' => 'nullable|string|max:1000',
        ]);

        $order = Order::with('user')->findOrFail($id);

        if ($order->payment_status !== 'Refund Pending') {
            return response()->json([
                'status'  => false,
                'message' => 'This order is not in Refund Pending status.',
            ], 422);
        }

        $order->update([
            'payment_status' => 'Refunded',
            'refunded_by'    => Auth::id(),
            'refunded_at'    => now(),
            'refund_notes'   => $request->refund_notes ?? null,
        ]);

        // Notify client
        $order->user?->notify(new RefundStatusChanged(
            order: ['id' => $order->id, 'order_number' => $order->order_number, 'total_amount' => $order->total_amount],
            refundStatus: 'Refunded',
            refundNotes: $request->refund_notes,
        ));

        return response()->json([
            'status'  => true,
            'message' => "Refund marked as completed for Order #{$order->order_number}.",
            'order'   => $this->formatOrder($order->fresh(['user', 'warehouse', 'refundedBy'])),
        ]);
    }

    /*─────────────────────────────────────────────
     | Helper: format order for response
     ─────────────────────────────────────────────*/
    private function formatOrder(Order $o): array
    {
        return [
            'id'                  => $o->id,
            'order_number'        => $o->order_number,
            'status'              => $o->status,
            'payment_status'      => $o->payment_status,
            'total_amount'        => $o->total_amount,
            'created_at'          => $o->created_at,
            'cancelled_at'        => $o->cancelled_at,
            'cancellation_reason' => $o->cancellation_reason,
            'refunded_at'         => $o->refunded_at,
            'refund_notes'        => $o->refund_notes,
            'refunded_by_name'    => $o->refundedBy?->name,
            'client_name'         => $o->user?->name,
            'client_email'        => $o->user?->email,
            'client_phone'        => $o->user?->phone,
            'warehouse_name'      => $o->warehouse?->name,
            'receipt_path'        => $o->receipt_path,
        ];
    }
}
