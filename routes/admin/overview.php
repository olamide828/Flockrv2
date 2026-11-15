<?php

use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Admin\SystemController;
use Illuminate\Support\Facades\Route;

// Included inside the role:admin /api/admin group (see routes/api.php).
Route::get('/overview', [OverviewController::class, 'overview']);
Route::get('/overview/analytics', [OverviewController::class, 'analytics']);
Route::get('/badges', [OverviewController::class, 'badges']);
Route::get('/search', [OverviewController::class, 'search']);

Route::get('/system/health', [SystemController::class, 'health']);
Route::get('/system/failed-jobs', [SystemController::class, 'failedJobs']);
Route::post('/system/failed-jobs/retry-all', [SystemController::class, 'retryAll']);
Route::post('/system/failed-jobs/{uuid}/retry', [SystemController::class, 'retryFailed']);
Route::delete('/system/failed-jobs/{uuid}', [SystemController::class, 'forgetFailed']);
Route::get('/audit-logs', [SystemController::class, 'audit']);
