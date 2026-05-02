<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\MappingController;
use App\Http\Controllers\Api\AiProxyController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Routes
Route::post('/v1/register', [AuthController::class, 'register']);
Route::post('/v1/login', [AuthController::class, 'login']);

// Authenticated Routes
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    // AI Proxy Routes mapped to Express Server
    Route::post('/extract', [AiProxyController::class, 'extract']);
    Route::post('/ai-fix', [AiProxyController::class, 'aiFix']);
    Route::post('/export', [AiProxyController::class, 'export']);
    Route::get('/test-proxy', [AiProxyController::class, 'nodeHealth']);
    
    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // File Management
    Route::post('/upload', [DocumentController::class, 'upload']);
    Route::get('/status/{sessionId}', [DocumentController::class, 'status']);
    Route::delete('/session/{sessionId}', [DocumentController::class, 'deleteSession']);
    Route::get('/export/{sessionId}', [DocumentController::class, 'export']); // To be implemented

    // User Management
    Route::get('/user/storage', [UserController::class, 'getStorageQuota']);
    Route::get('/user/history', [UserController::class, 'getHistory']);
    Route::get('/user/notifications', [UserController::class, 'getNotifications']);
    Route::get('/jobs/{uuid}', [AiProxyController::class, 'getJob']);
    Route::post('/jobs/{id}/save', [AiProxyController::class, 'saveJob']);
    Route::get('/files/{id}', [AiProxyController::class, 'serveFile'])->name('api.files.show');

    // Configuration Management
    Route::apiResource('mappings', MappingController::class);

    // Admin Routes
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/storage-stats', [AdminController::class, 'storageStats']);
        Route::get('/cleanup-logs', [AdminController::class, 'cleanupLogs']);
        Route::post('/force-cleanup', [AdminController::class, 'forceCleanup']);
        Route::get('/metrics', [AdminController::class, 'metrics']);
        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::put('/users/{id}/quota', [AdminController::class, 'updateQuota']);
    });

    Route::post('/logout', [AuthController::class, 'logout']);
});
