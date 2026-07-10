<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .wrapper { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 12px;
               border: 1px solid #e2e8f0; overflow: hidden; }
    .header  { background: linear-gradient(135deg,#1e40af,#3b82f6); padding: 28px 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: -0.3px; }
    .header p  { color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px; }
    .body    { padding: 32px; }
    .otp-box { background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 10px;
               text-align: center; padding: 20px; margin: 24px 0; }
    .otp-code { font-size: 40px; font-weight: 800; color: #1e40af; letter-spacing: 10px;
                font-family: monospace; }
    .info    { font-size: 13px; color: #64748b; line-height: 1.7; }
    .warning { background: #fff7ed; border-left: 3px solid #f59e0b; padding: 10px 14px;
               border-radius: 4px; font-size: 12px; color: #92400e; margin-top: 20px; }
    .footer  { background: #f8fafc; padding: 16px 32px; text-align: center;
               font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🔥 GasHub</h1>
      <p>Reset Your Password</p>
    </div>
    <div class="body">
      <p style="color:#0f172a;font-size:15px;">Hi <strong>{{ $userName }}</strong>,</p>
      <p class="info">We received a request to reset your GasHub password. Use the verification code below to reset it.
        This code is valid for <strong>{{ $expiresInMinutes }} minutes</strong>.</p>

      <div class="otp-box">
        <div class="otp-code">{{ $otp }}</div>
      </div>

      <p class="info">Enter this code on the password reset page to choose a new password.</p>

      <div class="warning">
        ⚠️ Do not share this code with anyone. GasHub will never ask for your password reset code.
        If you did not request this, please ignore this email or contact support.
      </div>
    </div>
    <div class="footer">
      © {{ date('Y') }} GasHub · LPG Delivery Platform · Sri Lanka<br>
      This is an automated email, please do not reply.
    </div>
  </div>
</body>
</html>
