<?php

namespace App\Services;

use App\Models\Booking;

class InvoiceBuilder
{
    /** @return array<string, mixed> */
    public function build(Booking $booking): array
    {
        $intra = strcasecmp($booking->gst_state, (string) config('booking.company_state')) === 0;
        $half = intdiv($booking->gst_amount, 2);

        return [
            'invoice_number' => 'INV-'.$booking->reference,
            'issued_on' => ($booking->confirmed_at ?? $booking->created_at)->toDateString(),
            'reference' => $booking->reference,
            'status' => $booking->status,
            'bill_to' => [
                'name' => $booking->contact_name,
                'email' => $booking->contact_email,
                'phone' => $booking->contact_phone,
                'state' => $booking->gst_state,
            ],
            'line' => [
                'description' => $booking->tour->title.($booking->variant ? " ({$booking->variant->label})" : ''),
                'departure' => $booking->batch->starts_on->toDateString(),
                'quantity' => $booking->traveller_count,
                'unit_price' => $booking->unit_price,
                'amount' => $booking->subtotal,
            ],
            'tax' => [
                'rate_percent' => round($booking->gst_rate * 100, 2),
                'type' => $intra ? 'CGST+SGST' : 'IGST',
                'cgst' => $intra ? $half : 0,
                'sgst' => $intra ? $booking->gst_amount - $half : 0,
                'igst' => $intra ? 0 : $booking->gst_amount,
                'total' => $booking->gst_amount,
            ],
            'total' => $booking->total_amount,
            'paid' => $booking->paid_amount,
            'balance' => $booking->total_amount - $booking->paid_amount,
        ];
    }
}
