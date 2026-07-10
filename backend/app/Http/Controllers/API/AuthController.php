<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Handle Customer / Employee Account Registration
     */
    public function register(Request $request)
    {
        // 1. Run Validation over incoming payload fields
        $validator = Validator::make($request->all(), [
            'name'     => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\s]+$/'],
            'email'    => [
                'required', 'string', 'max:255', 'unique:users,email',
                // Must be: localpart@domain.com where domain is a known provider
                // e.g. gmail.com, yahoo.com, hotmail.com, outlook.com
                'regex:/^[a-zA-Z0-9._%+\-]+@(gmail|yahoo|hotmail|outlook|icloud|live|protonmail|proton)\.com$/i',
            ],
            'password' => 'required|string|min:6|confirmed',
            'nic'      => ['required', 'string', 'unique:users,nic', 'regex:/^([0-9]{9}[vVxX]|[0-9]{12})$/'],
            'phone'    => ['nullable', 'string', 'regex:/^(070|071|072|074|075|076|077|078)[0-9]{7}$/', 'unique:users,phone'],
            'address'  => 'nullable|string',
        ], [
            'name.regex'         => 'Name must contain letters only (no numbers or symbols).',
            'email.ends_with'    => 'Email must end with .com (e.g. user@gmail.com, user@yahoo.com).',
            'email.regex'        => 'Use a known email provider: gmail.com, yahoo.com, hotmail.com, or outlook.com.',
            'email.unique'       => 'This email is already registered.',
            'email.unique'       => 'Email already exists.',
            'nic.regex'          => 'Invalid Sri Lankan NIC format (e.g. 199512345V or 200112345678).',
            'nic.unique'         => 'NIC already exists.',
            'phone.regex'        => 'Invalid Sri Lankan phone number (must start with 070–078 and be 10 digits).',
            'phone.unique'       => 'Phone number already exists.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => 'Validation error metrics triggered.',
                'errors'  => $validator->errors()
            ], 422);
        }

        // 2. Insert secure model entity record into database pool
        // Role is ALWAYS forced to 'client' on public registration — never trust user-supplied role
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user = User::create([
            'name'           => $request->name,
            'email'          => $request->email,
            'password'       => Hash::make($request->password),
            'nic'            => $request->nic,
            'phone'          => $request->phone ?? null,
            'address'        => $request->address ?? null,
            'role'           => 'client',
            'is_verified'    => false,
            'otp'            => $otp,
            'otp_expires_at' => now()->addMinutes(10),
            'otp_attempts'   => 0,
        ]);

        // 3. Send OTP verification email (silently fails on network issues)
        try {
            Mail::to($user->email)->send(new OtpMail($otp, $user->name, 10));
        } catch (\Exception $e) {
            // Email failed — log it but don't block registration
            \Illuminate\Support\Facades\Log::warning('OTP email failed: ' . $e->getMessage());
        }

        return response()->json([
            'status'  => true,
            'message' => 'Account created! Please check your email for the verification code.',
            'email'   => $user->email,
            'otp_dev' => null,
        ], 201);
    }

    /**
     * Process User Authentication Credentials Login
     */
    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => 'Invalid email or password structure format.',
                'errors'  => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'status'  => false,
                'message' => 'Unauthorized entry credentials match verification failed.'
            ], 401);
        }

        // Block unverified clients from logging in
        if ($user->role === 'client' && !$user->is_verified) {
            return response()->json([
                'status'       => false,
                'message'      => 'Your email is not verified. Please complete email verification first.',
                'needs_verify' => true,
                'email'        => $user->email,
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'        => true,
            'message'       => 'Login sequence verified successfully.',
            'access_token'  => $token,
            'token_type'    => 'Bearer',
            'user'          => $user
        ], 200);
    }

    /**
     * Update Profile Info (Phone and Address completed inside the dashboard layout)
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'phone'   => ['required', 'string', 'regex:/^(070|071|072|074|075|076|077|078)[0-9]{7}$/'],
            'address' => 'required|string',
        ], [
            'phone.regex' => 'Invalid Sri Lankan phone number (must start with 070–078 and be 10 digits).',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user->update([
            'phone'   => $request->phone,
            'address' => $request->address,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Profile verification records saved successfully.',
            'user'    => $user
        ], 200);
    }
}