<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\ProfileController;
use App\Http\Controllers\API\VerifyOtpController;
use App\Http\Controllers\API\ForgotPasswordController;
use App\Http\Controllers\PortalAuthController;
use App\Http\Controllers\AdminEmployeeController;
use App\Http\Controllers\EmployeePasswordController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\EmployeeDashboardController;
use App\Http\Controllers\ManagerDashboardController;
use App\Http\Controllers\DriverDashboardController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\CylinderTypeController;
use App\Http\Controllers\WarehouseStockController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\TripController;
use App\Http\Controllers\OrderController;

/*──────────────────────────────────────────────────────
 | PUBLIC
 ──────────────────────────────────────────────────────*/
Route::post('/register',      [AuthController::class,   'register']);
Route::post('/login',         [AuthController::class,   'login']);
Route::post('/portal/login',  [PortalAuthController::class, 'login']);

// Email OTP verification (public — user not yet logged in)
Route::post('/verify-otp',    [VerifyOtpController::class, 'verify']);
Route::post('/resend-otp',    [VerifyOtpController::class, 'resend']);

// Forgot Password routes
Route::post('/forgot-password/request', [ForgotPasswordController::class, 'requestOtp']);
Route::post('/forgot-password/verify',  [ForgotPasswordController::class, 'verifyOtp']);
Route::post('/forgot-password/reset',   [ForgotPasswordController::class, 'resetPassword']);

// Public feedback submission (guests + clients)
Route::post('/feedback',      [FeedbackController::class, 'store']);

/*──────────────────────────────────────────────────────
 | AUTHENTICATED (all roles)
 ──────────────────────────────────────────────────────*/
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/me', fn (Request $r) => $r->user()->load('warehouse'));
    Route::put('/user/profile/update', [ProfileController::class, 'update']);
    Route::get('/user/active-orders-check', [ProfileController::class, 'checkActiveOrders']);
    /* ── Notifications ── */
    Route::get('/notifications',                  [NotificationController::class, 'index']);
    Route::post('/notifications/read-all',        [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read',       [NotificationController::class, 'markRead']);
    Route::delete('/notifications/{id}',          [NotificationController::class, 'destroy']);
    Route::post('/logout', function (Request $r) {
        $r->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out']);
    });
    Route::post('/change-password', [EmployeePasswordController::class, 'changePassword']);

    /* ── Master data readable by every authenticated user ── */
    Route::get('/warehouses',     [WarehouseController::class,   'index']);
    Route::get('/brands',         [BrandController::class,       'index']);
    Route::get('/cylinder-types', [CylinderTypeController::class,'index']);

    /* ── Nearest warehouse (client booking + preview) ── */
    Route::get('/warehouse/nearest', [OrderController::class, 'nearest']);

    /* ── Stock breakdown for a specific warehouse (all authenticated users) ── */
    Route::get('/warehouse/{id}/stock', function ($id) {
        return \App\Models\WarehouseStock::where('warehouse_id', $id)
            ->with('cylinderType.brand')
            ->get()
            ->map(fn ($s) => [
                'cylinder_type_id' => $s->cylinder_type_id,
                'name'             => $s->cylinderType?->name ?? '—',
                'weight'           => $s->cylinderType?->weight ?? '—',
                'brand'            => $s->cylinderType?->brand?->name ?? '—',
                'quantity'         => $s->quantity,
            ]);
    });

    /* ── Driver live location – readable by all authenticated ── */
    Route::get('/driver/{id}/location', [DriverDashboardController::class, 'getLocation']);

    /* ── Orders (client-facing) ── */
    Route::get('/orders/history',              [OrderController::class, 'getClientHistory']);
    Route::post('/orders/check-stock',         [OrderController::class, 'checkStock']);
    Route::post('/orders/place',               [OrderController::class, 'store']);
    Route::post('/orders/place-partial',       [OrderController::class, 'storePartial']);
    Route::post('/orders/{id}/cancel',         [OrderController::class, 'cancel']);
    Route::post('/orders/{id}/payment',        [OrderController::class, 'uploadPayment']);

    /* ── Invoice / Receipt — all authenticated roles ── */
    Route::get('/orders/{id}/invoice', function ($id, \Illuminate\Http\Request $r) {
        $user  = $r->user();
        $order = \App\Models\Order::with(['user', 'warehouse', 'driver'])->findOrFail($id);

        // Client can only see their own orders (any status)
        if ($user->role === 'client') {
            if ($order->user_id !== $user->id) abort(403);
        }
        // Manager can only see their warehouse orders
        if ($user->role === 'manager' && $user->warehouse_id && $order->warehouse_id !== $user->warehouse_id) {
            abort(403);
        }

        $items = is_array($order->items_summary)
            ? $order->items_summary
            : json_decode($order->items_summary ?? '[]', true);

        return response()->json([
            'status'     => true,
            'invoice'    => [
                'order_number'        => $order->order_number,
                'status'              => $order->status,
                'order_type'          => $order->order_type,
                'created_at'          => $order->created_at?->format('d M Y, h:i A'),
                'updated_at'          => $order->updated_at?->format('d M Y, h:i A'),
                'items'               => $items,
                'total_quantity'      => $order->total_quantity,
                'requested_quantity'  => $order->requested_quantity,
                'delivered_quantity'  => $order->delivered_quantity,
                'total_empty_returns' => $order->total_empty_returns,
                'total_amount'        => $order->total_amount,
                'receipt_url'         => $order->receipt_path
                    ? url('storage/' . $order->receipt_path)
                    : null,
                // Warehouse
                'warehouse_name'    => $order->warehouse?->name,
                'warehouse_address' => $order->warehouse?->address,
                // Client
                'client_name'    => $order->user?->name,
                'client_email'   => $order->user?->email,
                'client_phone'   => $order->user?->phone,
                'client_address' => $order->user?->address,
                'client_nic'     => $order->user?->nic,
                // Driver
                'driver_name' => $order->driver?->name,
            ],
        ]);
    });

    /* ── CLIENT ── */
    Route::middleware('role:client')->group(function () {
        Route::get('/client/dashboard', function (Request $r) {
            return response()->json([
                'user'   => $r->user(),
                'orders' => \App\Models\Order::where('user_id', $r->user()->id)->latest()->get(),
            ]);
        });

        /* ── Client delivery history (stock movements linked to their orders) ── */
        Route::get('/client/delivery-history', function (Request $r) {
            $user = $r->user();

            // Get all order IDs belonging to this client
            $orderIds = \App\Models\Order::where('user_id', $user->id)->pluck('id');

            // Get stock-out movements linked to those orders (actual deliveries)
            $history = \App\Models\StockHistory::with(['cylinderType.brand', 'warehouse', 'order'])
                ->whereIn('order_id', $orderIds)
                ->where('type', 'out')
                ->latest()
                ->take(100)
                ->get()
                ->map(fn($h) => [
                    'id'              => $h->id,
                    'date'            => $h->created_at,
                    'order_number'    => $h->order?->order_number,
                    'order_id'        => $h->order_id,
                    'warehouse'       => $h->warehouse?->name,
                    'cylinder_name'   => trim(($h->cylinderType?->brand?->name ?? '') . ' ' . ($h->cylinderType?->name ?? '')),
                    'weight'          => $h->cylinderType?->weight,
                    'quantity'        => $h->quantity,
                    'unit_price'      => $h->cylinderType?->price,
                    'total_value'     => $h->cylinderType?->price
                                            ? (float)$h->cylinderType->price * $h->quantity
                                            : null,
                ]);

            return response()->json($history);
        });

        /* ── GasHub AI Chatbot ── */
        Route::post('/client/chat', function (Request $r) {
            $request = $r;
            $user    = $request->user();

            $request->validate(['message' => 'required|string|max:1000']);
            $userMessage = trim($request->message);

            // ── Gather live context data ──────────────────────────
            // Latest order
            $latestOrder = \App\Models\Order::where('user_id', $user->id)
                ->with('warehouse')
                ->latest()->first();

            // All orders (last 10)
            $orderHistory = \App\Models\Order::where('user_id', $user->id)
                ->latest()->take(10)->get()
                ->map(fn($o) => [
                    'order_number' => $o->order_number,
                    'status'       => $o->status,
                    'quantity'     => $o->total_quantity,
                    'amount'       => $o->total_amount,
                    'date'         => $o->created_at->format('d M Y'),
                ])->toArray();

            // Available cylinder types + prices
            $cylinderTypes = \App\Models\CylinderType::with('brand')->get()
                ->map(fn($ct) => [
                    'name'   => ($ct->brand->name ?? '') . ' ' . $ct->name,
                    'weight' => $ct->weight . 'kg',
                    'price'  => 'LKR ' . number_format($ct->price, 2),
                ])->toArray();

            // Nearest warehouse stock (if user has location)
            $stockInfo = [];
            if ($user->latitude && $user->longitude) {
                $warehouses = \App\Models\Warehouse::where('status', true)->get();
                foreach ($warehouses as $wh) {
                    $stockLines = \App\Models\WarehouseStock::where('warehouse_id', $wh->id)
                        ->with('cylinderType.brand')->get();
                    foreach ($stockLines as $s) {
                        $stockInfo[] = [
                            'warehouse'     => $wh->name,
                            'cylinder'      => ($s->cylinderType->brand->name ?? '') . ' ' . ($s->cylinderType->name ?? '') . ' ' . ($s->cylinderType->weight ?? '') . 'kg',
                            'quantity'      => $s->quantity,
                        ];
                    }
                }
            }

            // ── Detect complaint intent & save ───────────────────
            $complaintKeywords = ['damaged', 'broken', 'complaint', 'defective', 'wrong', 'problem', 'issue', 'faulty', 'leaking', 'leak', 'empty', 'delay', 'late', 'slow', 'rude', 'unhappy', 'bad', 'refund', 'fail', 'accident', 'disappointed', 'not delivered', 'never arrived', 'error', 'scam', 'cheat', 'poor', 'worst', 'stolen', 'missing'];
            $isComplaint = false;
            foreach ($complaintKeywords as $kw) {
                if (stripos($userMessage, $kw) !== false) { $isComplaint = true; break; }
            }
            $ticketId = null;
            if ($isComplaint) {
                $feedback = \App\Models\Feedback::create([
                    'user_id' => $user->id,
                    'type'    => 'complaint',
                    'subject' => 'Chatbot Complaint: ' . substr($userMessage, 0, 100),
                    'message' => $userMessage,
                    'name'    => $user->name,
                    'email'   => $user->email,
                    'status'  => 'open',
                ]);
                $ticketId = 'GH-' . str_pad($feedback->id, 4, '0', STR_PAD_LEFT);

                // Send notification to all admins
                $admins = \App\Models\User::where('role', 'admin')->get();
                $notif = new \App\Notifications\ComplaintFiled(
                    clientName: $user->name,
                    ticketId: $ticketId,
                    subject: $feedback->subject,
                    messageContent: $feedback->message,
                    orderNumber: $latestOrder ? $latestOrder->order_number : null,
                    orderStatus: $latestOrder ? $latestOrder->status : null
                );
                foreach ($admins as $admin) {
                    $admin->notify($notif);
                }
            }

            // ── Build system prompt with context ─────────────────
            $contextJson = json_encode([
                'customer_name'   => $user->name,
                'latest_order'    => $latestOrder ? [
                    'order_number' => $latestOrder->order_number,
                    'status'       => $latestOrder->status,
                    'quantity'     => $latestOrder->total_quantity,
                    'warehouse'    => $latestOrder->warehouse?->name,
                    'amount'       => 'LKR ' . number_format($latestOrder->total_amount, 2),
                    'date'         => $latestOrder->created_at->format('d M Y'),
                ] : null,
                'order_history'   => $orderHistory,
                'cylinder_types'  => $cylinderTypes,
                'stock_available' => $stockInfo,
                'complaint_saved' => $isComplaint ? ['ticket_id' => $ticketId] : null,
            ], JSON_PRETTY_PRINT);

            $systemPrompt = <<<PROMPT
You are GasHub AI Assistant — a strict, helpful customer support chatbot exclusively for GasHub, an LPG gas cylinder delivery platform in Sri Lanka.

STRICT SCOPE ENFORCEMENT:
You ONLY answer questions related to GasHub services and handle customer complaints. You have absolutely NO information or capabilities regarding topics outside of GasHub.

If the user asks about ANY topic outside of GasHub (such as general knowledge, history, science, politics, news, weather, coding/programming, general advice, personal opinions, or entertainment), you MUST immediately refuse to answer. You are forbidden from answering outside questions.

When refusing outside questions, always reply with this EXACT message and absolutely nothing else:
"I can only assist with GasHub services, orders, stock, deliveries, and warehouse-related information. Please ask me about your gas orders or deliveries! 🔥"

✅ ALLOWED topics to discuss:
- Order placement, tracking, status, cancellation
- Cylinder availability and stock at warehouses
- Cylinder prices and types
- Delivery status and ETA
- Nearest warehouse selection logic
- Split-order handling (orders fulfilled from multiple warehouses)
- Driver assignment and delivery capacity
- User registration, login, email verification
- Payment and receipt upload
- LPG safety instructions
- Complaints, feedback, and support tickets

GASHUB BUSINESS LOGIC:
1. WAREHOUSE SELECTION: Orders go to nearest warehouse with enough stock. If two warehouses are equal distance, the one with MORE stock is chosen.
2. SPLIT ORDERS: If no single warehouse has enough stock, the order is split — e.g., 6 from Warehouse A + 4 from Warehouse B to fulfil 10 cylinders.
3. DRIVER CAPACITY: Each driver has a max capacity (default 15 cylinders). Multiple orders can be assigned to the same driver until capacity is reached. A new driver is assigned once the current one is full.
4. ORDER STATUSES: Pending → Approved → Out for Delivery → Delivered (or Rejected/Cancelled)
5. MINIMUM ORDER: 20 cylinders minimum per order. MAXIMUM: 100 cylinders per cylinder type per order.
6. DELIVERY FEE: LKR 100 base + LKR 100 per km from warehouse to client.

You help clients with:
1. Order tracking — use latest_order data for status, warehouse, ETA
2. Stock availability — use stock_available data
3. Price inquiry — use cylinder_types data
4. Delivery ETA — "Out for Delivery" = 20-40 min, "Approved" = 1-2 hours, "Pending" = awaiting manager approval
5. Safety assistant — LPG safety: turn off regulator, open windows, avoid fire, call support: 0112345678
6. Complaint handling — if complaint detected and saved, give ticket ID to client
7. Order history — summarize from order_history data

LIVE DATA FOR THIS CLIENT:
{$contextJson}

RESPONSE RULES:
- Be concise, friendly, and professional
- Reply in the same language the user writes in (English, Sinhala, or Tamil)
- Never invent data — only use the provided context above
- Keep responses 2-5 lines unless listing items
- If a complaint was saved, explicitly state: "We noticed your latest order #{order_number} is currently {status}. GasHub will contact you soon regarding your complaint (Ticket ID: {ticket_id})!" If no orders exist, state: "GasHub will contact you soon regarding your complaint (Ticket ID: {ticket_id})!"
PROMPT;

            // ── Call Groq API ─────────────────────────────────────
            $apiKey = config('services.groq.key');
            if (!$apiKey || $apiKey === 'your_groq_api_key_here') {
                return response()->json([
                    'reply' => 'AI assistant is not configured yet. Please contact support.',
                ]);
            }

            try {
                $groqResponse = \Illuminate\Support\Facades\Http::timeout(15)
                    ->withoutVerifying()
                    ->withHeaders([
                        'Authorization' => "Bearer {$apiKey}",
                        'Content-Type'  => 'application/json',
                    ])
                    ->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model'       => 'llama-3.3-70b-versatile',
                        'temperature' => 0.7,
                        'max_tokens'  => 300,
                        'messages'    => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user',   'content' => $userMessage],
                        ],
                    ]);

                $reply = $groqResponse->json('choices.0.message.content');

                if (!$reply) {
                    $errorMsg = $groqResponse->json('error.message') ?? 'Unknown error';
                    \Illuminate\Support\Facades\Log::error('Groq API error: ' . $errorMsg);
                    $reply = 'Sorry, I could not process your request right now. Please try again.';
                }

                return response()->json(['reply' => trim($reply), 'ticket_id' => $ticketId]);

            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Groq exception: ' . $e->getMessage());
                return response()->json(['reply' => 'AI service is temporarily unavailable. Please try again shortly.']);
            }
        });
    });

    /* ── ADMIN ── */
    Route::middleware('role:admin')->group(function () {
        Route::get('/admin/dashboard', [AdminDashboardController::class, 'index']);

        /* ── AI Demand Prediction ── */
        Route::get('/admin/ai/demand-prediction', function () {
            // Use SUM(total_quantity) = cylinders so it matches the stock prediction unit
            $rows = \App\Models\Order::selectRaw("MONTH(created_at) as month, YEAR(created_at) as year, SUM(total_quantity) as total_orders")
                ->groupByRaw("YEAR(created_at), MONTH(created_at)")
                ->orderByRaw("YEAR(created_at), MONTH(created_at)")
                ->get()
                ->map(fn ($r) => [
                    'month'        => (int)$r->month,
                    'year'         => (int)$r->year,
                    'total_orders' => (int)$r->total_orders,
                ])
                ->values()
                ->toArray();

            if (count($rows) < 1) {
                return response()->json(['status' => false, 'message' => 'No order history found yet.']);
            }

            try {
                $response = \Illuminate\Support\Facades\Http::timeout(5)
                    ->post('http://127.0.0.1:5001/predict-bulk', ['data' => $rows]);
                if ($response->successful()) {
                    return response()->json($response->json());
                }
                return response()->json(['status' => false, 'message' => 'AI service error.']);
            } catch (\Exception $e) {
                return response()->json(['status' => false, 'message' => 'AI service unavailable.']);
            }
        });

        /* ── AI Stock Prediction ── */
        Route::get('/admin/ai/stock-prediction', function () {
            $warehouses = \App\Models\Warehouse::where('status', true)->get();

            $payload = $warehouses->map(function ($wh) {
                $currentStock = (int) \App\Models\WarehouseStock::where('warehouse_id', $wh->id)->sum('quantity');

                $monthlyOut = \App\Models\Order::selectRaw("MONTH(created_at) as month, YEAR(created_at) as year, SUM(total_quantity) as qty")
                    ->where('warehouse_id', $wh->id)
                    ->where('status', 'Delivered')
                    ->groupByRaw("YEAR(created_at), MONTH(created_at)")
                    ->orderByRaw("YEAR(created_at), MONTH(created_at)")
                    ->get()
                    ->map(fn ($r) => [
                        'month' => (int)$r->month,
                        'year'  => (int)$r->year,
                        'qty'   => (int)$r->qty,
                    ])
                    ->values()
                    ->toArray();

                return [
                    'id'            => $wh->id,
                    'name'          => $wh->name,
                    'current_stock' => $currentStock,
                    'monthly_out'   => $monthlyOut,
                ];
            })->values()->toArray();

            try {
                $response = \Illuminate\Support\Facades\Http::timeout(5)
                    ->post('http://127.0.0.1:5001/predict-stock', ['warehouses' => $payload]);
                if ($response->successful()) {
                    return response()->json($response->json());
                }
                return response()->json(['status' => false, 'message' => 'AI service error.']);
            } catch (\Exception $e) {
                return response()->json(['status' => false, 'message' => 'AI service unavailable.']);
            }
        });

        /* Employee CRUD */
        Route::apiResource('/admin/employees', AdminEmployeeController::class);

        /* Warehouse CRUD */
        Route::apiResource('warehouses', WarehouseController::class)->except(['index']);

        /* Stock */
        Route::get('/warehouse-stock',        [WarehouseStockController::class, 'index']);
        Route::post('/warehouse-stock',       [WarehouseStockController::class, 'store']);
        Route::delete('/warehouse-stock/{id}',[WarehouseStockController::class, 'destroy']);

        Route::get('/stock-history', function () {
            return \App\Models\StockHistory::with(['warehouse','cylinderType.brand','user','order'])
                ->latest()->take(200)->get();
        });

        /* Orders admin management */
        Route::get('/orders',                       [OrderController::class, 'index']);

        /* Active drivers map — all drivers with live GPS + current order */
        Route::get('/admin/drivers/live', function () {
            $drivers = \App\Models\User::where('role', 'driver')
                ->where('status', true)
                ->with('warehouse')
                ->get()
                ->map(function ($d) {
                    // Current active order for this driver
                    $activeOrder = \App\Models\Order::where('assigned_driver_id', $d->id)
                        ->where('status', 'Out for Delivery')
                        ->with('user')
                        ->latest()
                        ->first();

                    return [
                        'id'           => $d->id,
                        'name'         => $d->name,
                        'employee_id'  => $d->employee_id,
                        'warehouse'    => $d->warehouse?->name,
                        'lat'          => $d->driver_lat,
                        'lng'          => $d->driver_lng,
                        'updated_at'   => $d->driver_location_updated_at,
                        'is_active'    => $d->driver_lat && $d->driver_lng,
                        'current_load' => $d->driver_current_load ?? 0,
                        'max_capacity' => $d->driver_max_capacity ?? 1000,
                        'active_order' => $activeOrder ? [
                            'order_number' => $activeOrder->order_number,
                            'total_quantity'=> $activeOrder->total_quantity,
                            'client_name'  => $activeOrder->user?->name,
                            'client_phone' => $activeOrder->user?->phone,
                            'client_address'=> $activeOrder->user?->address,
                        ] : null,
                    ];
                });

            return response()->json($drivers);
        });

        /* Lists */
        Route::get('/drivers', function () {
            return \App\Models\User::where('role','driver')->with('warehouse')->get();
        });
        Route::get('/clients', function () {
            return \App\Models\User::where('role','client')->latest()->get();
        });

        /* Cylinder types & brands management */
        Route::post('/admin/cylinder-types',         [CylinderTypeController::class,'store']);
        Route::put('/admin/cylinder-types/{id}',     [CylinderTypeController::class,'update']);
        Route::delete('/admin/cylinder-types/{id}',  [CylinderTypeController::class,'destroy']);
        Route::post('/admin/brands',                 [BrandController::class,'store']);
        Route::delete('/admin/brands/{id}',          [BrandController::class,'destroy']);

        /* Feedback management */
        Route::get('/admin/feedback',            [FeedbackController::class,'index']);
        Route::put('/admin/feedback/{id}',       [FeedbackController::class,'update']);
        Route::delete('/admin/feedback/{id}',    [FeedbackController::class,'destroy']);

        /* Refund management */
        Route::get('/admin/refunds',                      [\App\Http\Controllers\RefundController::class, 'index']);
        Route::post('/admin/refunds/{id}/mark-refunded',  [\App\Http\Controllers\RefundController::class, 'markRefunded']);
    });

    /* ── MANAGER ── */
    Route::middleware('role:manager')->group(function () {
        Route::get('/manager/dashboard',                    [ManagerDashboardController::class,'index']);
        Route::post('/manager/orders/{id}/approve',         [ManagerDashboardController::class,'approve']);
        Route::post('/manager/orders/{id}/reject',          [ManagerDashboardController::class,'reject']);
        Route::post('/manager/orders/{id}/assign-driver',   [ManagerDashboardController::class,'assignDriver']);
        Route::post('/manager/stock',                       [WarehouseStockController::class, 'store']);
        Route::delete('/manager/stock/{id}',                [WarehouseStockController::class, 'destroy']);
        Route::get('/manager/stock-history', function (\Illuminate\Http\Request $r) {
            $warehouseId = $r->user()->warehouse_id;
            return \App\Models\StockHistory::with(['cylinderType.brand', 'user', 'order'])
                ->where('warehouse_id', $warehouseId)
                ->latest()
                ->take(100)
                ->get();
        });
        Route::get('/trips',                                [TripController::class,'index']);
    });

    /* ── DRIVER ── */
    Route::middleware('role:driver')->group(function () {
        Route::get('/driver/dashboard',                         [DriverDashboardController::class,'index']);
        Route::post('/driver/orders/{id}/status',              [DriverDashboardController::class,'updateStatus']);
        Route::post('/driver/location',                        [DriverDashboardController::class,'updateLocation']);

        // Trip management
        Route::get('/driver/available-orders',                 [TripController::class,'availableOrders']);
        Route::get('/driver/trips/current',                    [TripController::class,'currentTrip']);
        Route::get('/driver/trips/history',                    [TripController::class,'tripHistory']);
        Route::post('/driver/trips',                           [TripController::class,'createTrip']);
        Route::post('/driver/trips/{id}/load',                 [TripController::class,'loadTrip']);
        Route::post('/driver/trips/{id}/start',                [TripController::class,'startTrip']);
        Route::post('/driver/trips/{tripId}/deliver/{orderId}',[TripController::class,'recordDelivery']);
        Route::post('/driver/trips/{tripId}/deliver/{orderId}/otp-generate', [TripController::class,'generateDeliveryOtp']);
        Route::post('/driver/trips/{tripId}/deliver/{orderId}/otp-verify',   [TripController::class,'verifyDeliveryOtp']);
        Route::post('/driver/trips/{id}/end',                  [TripController::class,'endTrip']);
    });

    /* ── ADMIN + MANAGER: view trips ── */
    Route::middleware('role:admin')->group(function () {
        Route::get('/trips', [TripController::class, 'index']);
    });
});
