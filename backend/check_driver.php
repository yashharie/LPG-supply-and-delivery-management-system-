<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
use Illuminate\Support\Facades\DB;

echo "=== DRIVERS ===" . PHP_EOL;
$drivers = DB::table('users')->where('role','driver')->get(['id','name','employee_id','status','warehouse_id']);
foreach ($drivers as $d) {
    echo "ID:{$d->id} | {$d->name} | EmpID:{$d->employee_id} | Status:{$d->status} | WH:{$d->warehouse_id}" . PHP_EOL;
}

echo PHP_EOL . "=== ACTIVE TRIPS ===" . PHP_EOL;
$trips = DB::table('trips')->whereIn('status', ['active','pending'])->get();
foreach ($trips as $t) {
    echo "Trip#{$t->id} | driver:{$t->driver_id} | status:{$t->status} | total_loaded:{$t->total_loaded}" . PHP_EOL;
    $tos = DB::table('trip_orders')->where('trip_id', $t->id)->get();
    foreach ($tos as $to) {
        echo "  TripOrder: order_id={$to->order_id} accepted={$to->accepted_quantity} delivered={$to->delivered_quantity}" . PHP_EOL;
    }
}
