<?php

use App\Http\Controllers\Admin\CouponAdminController;
use App\Http\Controllers\Admin\LedgerController;
use App\Http\Controllers\Admin\OrderAdminController;
use App\Http\Controllers\Admin\PayoutAdminController;
use App\Http\Controllers\DisputeController;
use Illuminate\Support\Facades\Route;

// Included inside the `role:admin` + `prefix('admin')` group in routes/api.php. Plain statements only (route:cache safe).

// Orders
Route::get('/orders',                          [OrderAdminController::class, 'index']);
Route::get('/orders/{orderId}',                [OrderAdminController::class, 'show'])->whereNumber('orderId');
Route::post('/orders/{orderId}/cancel',        [OrderAdminController::class, 'cancel'])->whereNumber('orderId');
Route::post('/orders/{orderId}/retry-refund',  [OrderAdminController::class, 'retryRefund'])->whereNumber('orderId');
Route::post('/orders/{orderId}/release-escrow',[OrderAdminController::class, 'releaseEscrow'])->whereNumber('orderId');
Route::post('/orders/{orderId}/mark-delivered',[OrderAdminController::class, 'markDelivered'])->whereNumber('orderId');
Route::post('/orders/{orderId}/note',          [OrderAdminController::class, 'note'])->whereNumber('orderId');

// Payouts (seller wallet → seller bank only)
Route::get('/payouts',                         [PayoutAdminController::class, 'index']);
Route::post('/payouts/live',                   [PayoutAdminController::class, 'setLive']);
Route::post('/payouts/{payout}/approve',       [PayoutAdminController::class, 'approve']);
Route::post('/payouts/{payout}/reject',        [PayoutAdminController::class, 'reject']);

// Disputes (list + resolve already registered in api.php)
Route::get('/disputes/{disputeId}',            [DisputeController::class, 'adminShow'])->whereNumber('disputeId');
Route::post('/disputes/{disputeId}/messages',  [DisputeController::class, 'adminReply'])->whereNumber('disputeId');

// Ledger (read-only)
Route::get('/ledger/export',                   [LedgerController::class, 'export']);
Route::get('/ledger',                          [LedgerController::class, 'index']);

// Coupons
Route::get('/coupons',                         [CouponAdminController::class, 'index']);
Route::post('/coupons',                        [CouponAdminController::class, 'store']);
Route::post('/coupons/promo',                  [CouponAdminController::class, 'storePromo']);
Route::post('/coupons/{couponId}/toggle',      [CouponAdminController::class, 'toggle'])->whereNumber('couponId');
Route::post('/coupons/{couponId}/void',        [CouponAdminController::class, 'void'])->whereNumber('couponId');
Route::post('/coupons/{couponId}/extend',      [CouponAdminController::class, 'extend'])->whereNumber('couponId');
