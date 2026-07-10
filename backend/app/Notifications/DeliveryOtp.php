<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class DeliveryOtp extends Notification
{
    use Queueable;

    public function __construct(
        private string $otp,
        private string $orderNumber,
        private int    $quantity,
        private string $driverName,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("GasHub Delivery OTP — Order #{$this->orderNumber}")
            ->greeting("Hello {$notifiable->name}!")
            ->line("Your driver **{$this->driverName}** is about to deliver **{$this->quantity} cylinders** for Order #{$this->orderNumber}.")
            ->line("**Your Delivery OTP: {$this->otp}**")
            ->line("Share this OTP with the driver only after verifying the cylinders are correct.")
            ->line("This OTP expires in **10 minutes**.")
            ->salutation("GasHub Team");
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'         => 'delivery_otp',
            'order_number' => $this->orderNumber,
            'otp'          => $this->otp,
            'quantity'     => $this->quantity,
            'driver_name'  => $this->driverName,
            'message'      => "Delivery OTP for Order #{$this->orderNumber}: {$this->otp}",
        ];
    }
}
