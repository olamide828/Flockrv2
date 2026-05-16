<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class UserDashboardController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();

        $orders = $user->orders()
            ->with([
                'seller:id,name,username',
                'items.product:id,name,images',
            ])
            ->latest()
            ->get();

        $savedProducts = $user->savedProducts()
            ->with('seller:id,name,username,avatar,is_verified')
            ->where('status', 'active')
            ->get();

        $savedVideos = $user->savedVideos()
            ->where('status', 'active')
            ->with('user:id,name,username,avatar')
            ->latest()
            ->get();

        return Inertia::render('User/Dashboard', [
            'orders'        => $orders,
            'savedProducts' => $savedProducts,
            'savedVideos'   => $savedVideos,
        ]);
    }
}