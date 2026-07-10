<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Order;
use App\Models\Warehouse;
use App\Models\WarehouseStock;

class AdminDashboardController extends Controller
{
    public function index()
    {
        return response()->json([
            'stats' => [
                'total_users'      => User::count(),
                'total_clients'    => User::where('role', 'client')->count(),
                'total_drivers'    => User::where('role', 'driver')->count(),
                'total_managers'   => User::where('role', 'manager')->count(),
                'total_employees'  => User::where('role', 'employee')->count(),
                'total_warehouses' => Warehouse::count(),
                'total_orders'     => Order::count(),
                'pending_orders'   => Order::where('status', 'Pending')->count(),
                'approved_orders'  => Order::where('status', 'Approved')->count(),
                'delivered_orders' => Order::where('status', 'Delivered')->count(),
            ],
            'recent_orders'  => Order::with(['user','warehouse'])->latest()->take(10)->get(),
            'warehouses'     => Warehouse::withCount([
                'orders as active_orders_count' => fn ($q) =>
                    $q->whereIn('status', ['Pending', 'Approved', 'Out for Delivery'])
            ])->get(),
        ]);
    }
}
