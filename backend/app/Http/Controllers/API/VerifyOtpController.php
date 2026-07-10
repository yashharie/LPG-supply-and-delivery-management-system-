<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class VerifyOtpController extends Controller
{
    private const OTP_EXPIRY_MINUTES = 10;
    private const MAX_ATTEMPTS       = 3;

    /**
     * Verify the submitted OTP
     */
    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Account not found.'], 404);
        }

        if ($user->is_verified) {
            return response()->json(['status' => false, 'message' => 'Account is already verified.'], 400);
        }

        // Attempt limit check
        if ($user->otp_attempts >= self::MAX_ATTEMPTS) {
            return response()->json([
                'status'  => false,
                'message' => 'Too many failed attempts. Please request a new OTP.',
                'locked'  => true,
            ], 429);
        }

        // Expiry check
        if (!$user->otp_expires_at || now()->isAfter($user->otp_expires_at)) {
            return response()->json([
                'status'  => false,
                'message' => 'OTP has expired. Please request a new one.',
                'expired' => true,
            ], 400);
        }

        // OTP match check
        if ($user->otp !== $request->otp) {
            $user->increment('otp_attempts');
            $remaining = self::MAX_ATTEMPTS - $user->otp_attempts;
            return response()->json([
                'status'    => false,
                'message'   => "Incorrect OTP. {$remaining} attempt(s) remaining.",
                'remaining' => $remaining,
            ], 422);
        }

        // ✅ OTP correct — activate account
        $user->update([
            'is_verified'  => true,
            'otp'          => null,
            'otp_expires_at' => null,
            'otp_attempts' => 0,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Email verified successfully! You can now log in.',
        ]);
    }

    /**
     * Resend a fresh OTP
     */
    public function resend(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['status' => false, 'message' => 'Account not found.'], 404);
        }

        if ($user->is_verified) {
            return response()->json(['status' => false, 'message' => 'Account is already verified.'], 400);
        }

        // Generate and save new OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $user->update([
            'otp'          => $otp,
            'otp_expires_at' => now()->addMinutes(self::OTP_EXPIRY_MINUTES),
            'otp_attempts' => 0,
        ]);

        try {
            Mail::to($user->email)->send(new OtpMail($otp, $user->name, self::OTP_EXPIRY_MINUTES));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('OTP resend email failed: ' . $e->getMessage());
        }

        return response()->json([
            'status'  => true,
            'message' => 'A new OTP has been sent to your email.',
            'otp_dev' => null,
        ]);
    }
}
