<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; color: #111318;">
    <h2>Booking cancelled</h2>
    <p>Hi {{ $booking->contact_name }}, your booking <strong>{{ $booking->reference }}</strong> for <strong>{{ $booking->tour->title }}</strong> has been cancelled.</p>
    <table cellpadding="6" style="border-collapse: collapse;">
        <tr><td>Amount paid</td><td>₹{{ number_format($booking->paid_amount) }}</td></tr>
        <tr><td>Cancellation charges</td><td>₹{{ number_format((int) $booking->cancellation_deduction) }}</td></tr>
        <tr><td>Returned to you</td><td>₹{{ number_format($booking->paid_amount - (int) $booking->cancellation_deduction) }}</td></tr>
    </table>
    @if ($booking->cancellation_outcome === 'credit_note')
        <p>The returnable amount was issued as a credit note. You can use it on a new booking from your account.</p>
    @elseif ($booking->cancellation_outcome === 'refund')
        <p>A refund request has been recorded and will be processed to your original payment method.</p>
    @endif
</body>
</html>
