<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; color: #111318;">
    <h2>Thank you, {{ $booking->contact_name }}!</h2>
    <p>Your booking <strong>{{ $booking->reference }}</strong> is confirmed.</p>
    <p>
        <strong>{{ $booking->tour->title }}</strong><br>
        Departure: {{ $booking->batch->starts_on->format('d M Y') }}<br>
        Travellers: {{ $booking->traveller_count }}
    </p>
    <h3>Payment schedule</h3>
    <table cellpadding="6" style="border-collapse: collapse;">
        @foreach ($booking->milestones as $m)
            <tr>
                <td>{{ $m->label }}</td>
                <td>{{ $m->due_on->format('d M Y') }}</td>
                <td>₹{{ number_format($m->amount) }}</td>
                <td>{{ $m->status === 'paid' ? 'Paid' : 'Due' }}</td>
            </tr>
        @endforeach
    </table>
    <p>Total (incl. GST): <strong>₹{{ number_format($booking->total_amount) }}</strong></p>
    <p>You can view this booking and pay upcoming instalments from your Indian Rounds account.</p>
</body>
</html>
