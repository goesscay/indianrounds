<?php

namespace App\Mail;

use App\Models\PaymentMilestone;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentDue extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Sent from the queue (after the transaction commits) so a mail outage can never fail a payment or cancellation that is already recorded. */
    public int $tries = 5;

    /** @return list<int> */
    public function backoff(): array
    {
        return [60, 300, 900, 3600];
    }

    public function __construct(public PaymentMilestone $milestone)
    {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Payment due — {$this->milestone->booking->reference}");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.payment-due');
    }
}
