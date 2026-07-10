<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(\Illuminate\Contracts\Http\Kernel::class)->bootstrap();

$apiKey = config('services.gemini.key');
echo "API Key loaded: " . ($apiKey ? substr($apiKey, 0, 10) . "..." : "NOT FOUND") . "\n";

try {
    $response = \Illuminate\Support\Facades\Http::timeout(15)
        ->withoutVerifying()
        ->withHeaders(['Content-Type' => 'application/json'])
        ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}", [
            'contents' => [[
                'role'  => 'user',
                'parts' => [['text' => 'Say hello in one word']],
            ]],
        ]);

    echo "HTTP Status: " . $response->status() . "\n";
    echo "Response: " . $response->body() . "\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
