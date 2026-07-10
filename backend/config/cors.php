<?php

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    /*
    |--------------------------------------------------------------------------
    | Max Age (preflight cache)
    |--------------------------------------------------------------------------
    | Cache CORS preflight OPTIONS response for 2 hours.
    | This eliminates the extra OPTIONS round-trip on every API request,
    | which was a major source of login/request latency.
    */
    'max_age' => 7200,

    /*
    |--------------------------------------------------------------------------
    | Supports Credentials
    |--------------------------------------------------------------------------
    | MUST be false when using Bearer token auth (Sanctum tokens).
    | Setting true forces cookie/session auth overhead on every request.
    */
    'supports_credentials' => false,

];
