<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Mail\ForgotPasswordMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class ForgotPasswordController extends Controller
{
    /**
     * Request OTP to reset password
     */
    public function requestOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ], [
            'email.exists' => 'This email address is not registered in our system.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        // Generate 6-digit OTP
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->update([
            'otp'            => $otp,
            'otp_expires_at' => now()->addMinutes(10),
            'otp_attempts'   => 0,
        ]);

        // Send Email
        try {
            Mail::to($user->email)->send(new ForgotPasswordMail($otp, $user->name, 10));
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Forgot password OTP email failed: ' . $e->getMessage());
        }

        return response()->json([
            'status'  => true,
            'message' => 'A password reset code has been sent to your email.',
            'otp_dev' => null,
        ]);
    }

    /**
     * Verify OTP
     */
    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'otp'   => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user->otp) {
            return response()->json([
                'status'  => false,
                'message' => 'No reset code has been requested.',
            ], 422);
        }

        if ($user->otp_attempts >= 3) {
            return response()->json([
                'status'  => false,
                'message' => 'Too many failed verification attempts. Please request a new code.',
                'locked'  => true,
            ], 422);
        }

        if (now()->isAfter($user->otp_expires_at)) {
            return response()->json([
                'status'  => false,
                'message' => 'Reset code has expired. Please request a new one.',
                'expired' => true,
            ], 422);
        }

        if ($user->otp !== $request->otp) {
            $user->increment('otp_attempts');
            $remaining = 3 - $user->otp_attempts;
            return response()->json([
                'status'  => false,
                'message' => "Invalid reset code. {$remaining} attempts remaining.",
            ], 422);
        }

        return response()->json([
            'status'  => true,
            'message' => 'OTP verified successfully. You can now set a new password.',
        ]);
    }

    /**
     * Reset Password
     */
    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email|exists:users,email',
            'otp'      => 'required|string|size:6',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user->otp || $user->otp !== $request->otp) {
            return response()->json([
                'status'  => false,
                'message' => 'Invalid or unverified reset session.',
            ], 422);
        }

        if (now()->isAfter($user->otp_expires_at)) {
            return response()->json([
                'status'  => false,
                'message' => 'Reset code has expired. Please request a new one.',
            ], 422);
        }

        // Update password and clear OTP info
        $user->update([
            'password'       => Hash::make($request->password),
            'otp'            => null,
            'otp_expires_at' => null,
            'otp_attempts'   => 0,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Password reset successfully! You can now login with your new password.',
        ]);
    }
}
