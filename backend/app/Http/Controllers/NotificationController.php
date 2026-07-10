<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /* GET /api/notifications — paginated list */
    public function index(Request $request)
    {
        $user  = $request->user();
        $limit = (int) ($request->query('limit', 20));

        $notifications = $user->notifications()->latest()->take($limit)->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'type'       => $n->data['type']    ?? 'info',
                'title'      => $n->data['title']   ?? 'Notification',
                'message'    => $n->data['message'] ?? '',
                'data'       => $n->data,
                'read'       => !is_null($n->read_at),
                'created_at' => $n->created_at->diffForHumans(),
                'raw_time'   => $n->created_at->toISOString(),
            ]);

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $user->unreadNotifications()->count(),
        ]);
    }

    /* POST /api/notifications/{id}/read — mark single as read */
    public function markRead(Request $request, $id)
    {
        $n = $request->user()->notifications()->where('id', $id)->first();
        if ($n) $n->markAsRead();
        return response()->json(['status' => true]);
    }

    /* POST /api/notifications/read-all — mark all as read */
    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['status' => true]);
    }

    /* DELETE /api/notifications/{id} — delete one */
    public function destroy(Request $request, $id)
    {
        $request->user()->notifications()->where('id', $id)->delete();
        return response()->json(['status' => true]);
    }
}
