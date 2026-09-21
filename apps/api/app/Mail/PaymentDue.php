<?php

namespace App\Mail;

use App\Models\PaymentMilestone;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PaymentDue extends Mailable
{
    public function __construct(public PaymentMilestone $milestone) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Payment due — {$this->milestone->booking->reference}");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.payment-due');
    }
}
