<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $otp,
        public string $userName,
        public int    $expiresInMinutes = 10
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'GasHub – Your Verification Code');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.otp');
    }
}
