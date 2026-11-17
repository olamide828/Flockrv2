<?php

use App\Http\Controllers\Admin\ProductAdminController;
use App\Http\Controllers\Admin\ReportAdminController;
use App\Http\Controllers\Admin\VideoAdminController;
use Illuminate\Support\Facades\Route;

// Included inside the `role:admin` + `prefix('admin')` group in routes/api.php. Plain statements only (route:cache safe).

// Videos
Route::get('/videos',                          [VideoAdminController::class, 'index']);
Route::post('/videos/{id}/moderate',           [VideoAdminController::class, 'moderate'])->whereNumber('id');
Route::delete('/videos/{id}',                  [VideoAdminController::class, 'destroy'])->whereNumber('id');

// Products
Route::get('/products',                        [ProductAdminController::class, 'index']);
Route::post('/products/{id}/moderate',         [ProductAdminController::class, 'moderate'])->whereNumber('id');
Route::delete('/products/{id}',                [ProductAdminController::class, 'destroy'])->whereNumber('id');

// Reports
Route::get('/reports',                         [ReportAdminController::class, 'index']);
Route::post('/reports/{id}/resolve',           [ReportAdminController::class, 'resolve'])->whereNumber('id');
Route::get('/reports/{id}/content',            [ReportAdminController::class, 'content'])->whereNumber('id');
Route::delete('/reports/{id}/messages/{messageId}', [ReportAdminController::class, 'deleteMessage'])->whereNumber('id')->whereNumber('messageId');
