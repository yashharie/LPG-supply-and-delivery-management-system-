<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Feedback;
use Illuminate\Support\Facades\Auth;

class FeedbackController extends Controller
{
    /* PUBLIC: submit feedback — works for guests and logged-in clients */
    public function store(Request $request)
    {
        $request->validate([
            'type'    => 'required|in:feedback,complaint,issue',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:3000',
            'name'    => 'nullable|string|max:100',
            'email'   => 'nullable|email|max:200',
        ]);

        $user = Auth::user();

        $feedback = Feedback::create([
            'user_id' => $user?->id,
            'type'    => $request->type,
            'subject' => $request->subject,
            'message' => $request->message,
            'name'    => $user?->name    ?? $request->name,
            'email'   => $user?->email   ?? $request->email,
            'status'  => 'open',
        ]);

        $latestOrder = $user ? \App\Models\Order::where('user_id', $user->id)->latest()->first() : null;
        $orderNo = $latestOrder ? $latestOrder->order_number : null;
        $orderStatus = $latestOrder ? $latestOrder->status : null;
        $ticketId = 'GH-' . str_pad($feedback->id, 4, '0', STR_PAD_LEFT);

        if ($feedback->type === 'complaint') {
            // Send notification to all admins
            $admins = \App\Models\User::where('role', 'admin')->get();
            $notif = new \App\Notifications\ComplaintFiled(
                clientName: $feedback->name ?? 'Anonymous',
                ticketId: $ticketId,
                subject: $feedback->subject,
                messageContent: $feedback->message,
                orderNumber: $orderNo,
                orderStatus: $orderStatus
            );
            foreach ($admins as $admin) {
                $admin->notify($notif);
            }
        }

        $messageText = 'Thank you. Your submission has been received.';
        if ($feedback->type === 'complaint') {
            $orderInfo = $orderNo ? " regarding Order #{$orderNo} (currently {$orderStatus})" : "";
            $messageText = "Thank you. Your complaint has been received{$orderInfo}. GasHub will contact you soon. (Ticket ID: {$ticketId})";
        }

        return response()->json([
            'status'  => true,
            'message' => $messageText,
            'id'      => $feedback->id,
        ], 201);
    }

    /* ADMIN: list all feedback with filters */
    public function index(Request $request)
    {
        $query = Feedback::with('user')->latest();

        if ($request->type   && $request->type   !== 'all') $query->where('type',   $request->type);
        if ($request->status && $request->status !== 'all') $query->where('status', $request->status);

        return response()->json($query->get());
    }

    /* ADMIN: update status + optional reply */
    public function update(Request $request, $id)
    {
        $request->validate([
            'status'      => 'sometimes|in:open,reviewed,resolved',
            'admin_reply' => 'nullable|string|max:2000',
        ]);

        $feedback = Feedback::findOrFail($id);
        $feedback->update($request->only(['status', 'admin_reply']));

        return response()->json(['status' => true, 'feedback' => $feedback]);
    }

    /* ADMIN: delete */
    public function destroy($id)
    {
        Feedback::findOrFail($id)->delete();
        return response()->json(['status' => true]);
    }
}
