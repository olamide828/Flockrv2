<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\SellerTrustService;
use Illuminate\Http\JsonResponse;

class SellerTrustController extends Controller
{
    public function __construct(private readonly SellerTrustService $trust) {}

    /** GET /api/sellers/{seller}/trust */
    public function show(User $seller): JsonResponse
    {
        abort_unless($seller->role === 'seller', 404);
        return response()->json($this->trust->build($seller));
    }
}