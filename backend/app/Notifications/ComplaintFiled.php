<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ComplaintFiled extends Notification
{
    use Queueable;

    public function __construct(
        public readonly string $clientName,
        public readonly string $ticketId,
        public readonly string $subject,
        public readonly string $messageContent,
        public readonly ?string $orderNumber = null,
        public readonly ?string $orderStatus = null,
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $orderInfo = $this->orderNumber 
            ? " regarding Order #{$this->orderNumber} (currently {$this->orderStatus})" 
            : "";
        return [
            'type'          => 'complaint',
            'title'         => '🚨 New Complaint Received',
            'message'       => "Client {$this->clientName} filed a complaint{$orderInfo} (Ticket ID: {$this->ticketId}).",
            'ticket_id'     => $this->ticketId,
            'client_name'   => $this->clientName,
            'subject'       => $this->subject,
            'complaint_msg' => $this->messageContent,
            'order_number'  => $this->orderNumber,
            'order_status'  => $this->orderStatus,
        ];
    }
}
