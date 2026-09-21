<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingConfirmed extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Sent from the queue (after the transaction commits) so a mail outage can never fail a payment or cancellation that is already recorded. */
    public int $tries = 5;

    /** @return list<int> */
    public function backoff(): array
    {
        return [60, 300, 900, 3600];
    }

    public function __construct(public Booking $booking)
    {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Booking confirmed — {$this->booking->reference}");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.booking-confirmed');
    }
}
