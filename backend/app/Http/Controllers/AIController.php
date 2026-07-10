<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class AIController extends Controller
{
    public function predictDemand()
    {
        // STEP 1: Get real data from orders table
        $orders = DB::table('orders')
            ->selectRaw('MONTH(created_at) as month, SUM(quantity) as total_orders')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        // STEP 2: Send data to Python AI
        $response = Http::post('http://127.0.0.1:5001/predict-bulk', [
            'data' => $orders
        ]);

        // STEP 3: Return AI response
        return $response->json();
    }
}