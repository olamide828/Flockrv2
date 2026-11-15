<?php

use App\Http\Controllers\Admin\FeedAdminController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\Admin\RoomAdminController;
use Illuminate\Support\Facades\Route;

// Rooms
Route::get('/rooms',                              [RoomAdminController::class, 'index']);
Route::get('/rooms/{id}/messages',                [RoomAdminController::class, 'messages'])->whereNumber('id');
Route::delete('/rooms/{room}/messages/{message}', [RoomAdminController::class, 'deleteMessage'])->whereNumber(['room', 'message']);
Route::post('/rooms/{id}/close',                  [RoomAdminController::class, 'close'])->whereNumber('id');
Route::post('/rooms/{id}/restore',                [RoomAdminController::class, 'restore'])->whereNumber('id');

// Feed controls
Route::get('/feed/settings',  [FeedAdminController::class, 'settings']);
Route::post('/feed/settings', [FeedAdminController::class, 'save']);
Route::get('/feed/hashtags',  [FeedAdminController::class, 'hashtags']);

// Events (CRUD lives in api.php; results are new)
Route::get('/events/{event}/results', [EventController::class, 'adminResults'])->whereNumber('event');
