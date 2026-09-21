<?php

namespace App\Console\Commands;

use App\Mail\PaymentDue;
use App\Models\PaymentMilestone;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendPaymentReminders extends Command
{
    protected $signature = 'payments:send-reminders {--days=3 : Remind this many days before the due date}';

    protected $description = 'Email customers whose instalment is due soon';

    public function handle(): int
    {
        $sent = 0;

        PaymentMilestone::query()
            ->where('status', 'due')
            ->whereNull('reminded_at')
            ->whereDate('due_on', '<=', now()->addDays((int) $this->option('days'))->toDateString())
            ->whereHas('booking', fn ($b) => $b->where('status', 'confirmed'))
            ->with('booking.tour')
            ->each(function (PaymentMilestone $m) use (&$sent) {
                Mail::to($m->booking->contact_email)->send(new PaymentDue($m));
                $m->update(['reminded_at' => now()]);
                $sent++;
            });

        $this->info("Sent {$sent} reminder(s).");

        return self::SUCCESS;
    }
}
