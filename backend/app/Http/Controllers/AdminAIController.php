<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Http;

class AdminAIController extends Controller
{
    public function demandPrediction()
    {
        $response = Http::get('http://127.0.0.1:5001/predict-bulk');

        return response()->json($response->json());
    }
}