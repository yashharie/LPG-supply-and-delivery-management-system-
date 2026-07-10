<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ForgotPasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $otp,
        public string $userName,
        public int    $expiresInMinutes = 10
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'GasHub – Reset Your Password Code');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.forgot_password');
    }
}
