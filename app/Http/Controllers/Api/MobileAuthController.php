<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Token login for the Flockr mobile app.
 * The website keeps using cookie sessions (AuthController); this is only for the app.
 */
class MobileAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'login'       => ['required', 'string'],
            'password'    => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $user = User::where('email', $data['login'])
            ->orWhere('username', strtolower(ltrim($data['login'], '@')))
            ->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['The details you entered are incorrect.'],
            ]);
        }

        if (!$user->is_active || $user->suspended_at) {
            return response()->json(['message' => 'This account is not active.'], 403);
        }

        $token = $user->createToken($data['device_name'] ?? 'flockr-mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $this->payload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->payload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    private function payload(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'username'    => $user->username,
            'avatar_url'  => $user->avatar_url,
            'role'        => $user->role,
            'is_verified' => $user->isVerified(),
        ];
    }
}