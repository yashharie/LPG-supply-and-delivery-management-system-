<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Disable CSRF for API routes
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);

        // Register role-based access middleware alias
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);

        // NOTE: statefulApi() removed — using Bearer token auth, not cookie-based sessions
        // Enabling it caused unnecessary session overhead on every API request
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();