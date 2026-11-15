<?php

use App\Http\Controllers\Admin\BadgeAdminController;
use App\Http\Controllers\Admin\BlockAdminController;
use App\Http\Controllers\Admin\SubscriptionAdminController;
use App\Http\Controllers\Admin\SupportAdminController;
use App\Http\Controllers\Admin\UserAdminController;
use Illuminate\Support\Facades\Route;

// Included inside the /api/admin (role:admin) group by routes/api.php
Route::prefix('people')->group(function () {
    Route::get('/users', [UserAdminController::class, 'index']);
    Route::get('/users/{userId}', [UserAdminController::class, 'show']);
    Route::post('/users/{userId}/verify', [UserAdminController::class, 'verify']);
    Route::post('/users/{userId}/suspend', [UserAdminController::class, 'suspend']);
    Route::post('/users/{userId}/unsuspend', [UserAdminController::class, 'unsuspend']);
    Route::post('/users/{userId}/role', [UserAdminController::class, 'role']);
    Route::post('/users/{userId}/clear-flag', [UserAdminController::class, 'clearFlag']);
    Route::post('/users/{userId}/terminal-cleared', [UserAdminController::class, 'terminalCleared']);
    Route::post('/users/{userId}/restore', [UserAdminController::class, 'restore']);
    Route::delete('/users/{userId}', [UserAdminController::class, 'destroy']);
    Route::get('/flagged', [UserAdminController::class, 'flagged']);

    Route::get('/subscriptions', [SubscriptionAdminController::class, 'index']);
    Route::post('/subscriptions/grant', [SubscriptionAdminController::class, 'grant']);
    Route::post('/subscriptions/{subscriptionId}/extend', [SubscriptionAdminController::class, 'extend']);
    Route::post('/subscriptions/{subscriptionId}/cancel', [SubscriptionAdminController::class, 'cancel']);

    Route::get('/support', [SupportAdminController::class, 'index']);
    Route::post('/support/{ticketId}/resolve', [SupportAdminController::class, 'resolve']);
    Route::post('/support/{ticketId}/reopen', [SupportAdminController::class, 'reopen']);

    Route::get('/blocks', [BlockAdminController::class, 'index']);
    Route::delete('/blocks/{blockerId}/{blockedId}', [BlockAdminController::class, 'destroy']);

    Route::get('/badges', [BadgeAdminController::class, 'index']);
    Route::post('/badges', [BadgeAdminController::class, 'store']);
    Route::put('/badges/{badgeId}', [BadgeAdminController::class, 'update']);
    Route::get('/badges/{badgeId}/holders', [BadgeAdminController::class, 'holders']);
    Route::post('/badges/{badgeId}/award', [BadgeAdminController::class, 'award']);
    Route::delete('/badges/{badgeId}/holders/{userId}', [BadgeAdminController::class, 'revoke']);
});
