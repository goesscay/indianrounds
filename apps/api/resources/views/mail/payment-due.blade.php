<!doctype html>
<html>
<body style="font-family: Arial, sans-serif; color: #111318;">
    <h2>A payment is coming due</h2>
    <p>Hi {{ $milestone->booking->contact_name }}, your next instalment for <strong>{{ $milestone->booking->tour->title }}</strong> (booking {{ $milestone->booking->reference }}) is due on <strong>{{ $milestone->due_on->format('d M Y') }}</strong>.</p>
    <p>Amount: <strong>₹{{ number_format($milestone->amount) }}</strong></p>
    <p>Log in to your Indian Rounds account and open the booking to pay. Missing a due payment can lead to cancellation of the booking.</p>
</body>
</html>
