<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Postgres does not index foreign keys automatically. These cover the account, admin and
 * scheduler queries that would otherwise scan whole tables as bookings grow.
 */
return new class extends Migration
{
    /** @var array<string, list<array{0: list<string>, 1: string}>> */
    private array $indexes = [
        'bookings' => [[['user_id', 'created_at'], 'bookings_user_created_idx'], [['batch_id', 'status'], 'bookings_batch_status_idx'], [['tour_id'], 'bookings_tour_idx']],
        'payment_milestones' => [[['status', 'due_on'], 'milestones_status_due_idx']],
        'credit_notes' => [[['user_id', 'status'], 'credit_notes_user_status_idx']],
        'refunds' => [[['user_id'], 'refunds_user_idx'], [['booking_id'], 'refunds_booking_idx'], [['status'], 'refunds_status_idx']],
        'grievances' => [[['user_id'], 'grievances_user_idx'], [['status', 'stage'], 'grievances_status_stage_idx']],
        'leads' => [[['source', 'status'], 'leads_source_status_idx'], [['created_at'], 'leads_created_idx']],
        'tours' => [[['destination_id'], 'tours_destination_idx']],
        'posts' => [[['destination_id'], 'posts_destination_idx'], [['content_type'], 'posts_type_idx']],
        'job_applications' => [[['status'], 'job_applications_status_idx'], [['job_opening_id'], 'job_applications_opening_idx']],
        'audit_logs' => [[['created_at'], 'audit_logs_created_idx']],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $list) {
            Schema::table($table, function (Blueprint $t) use ($list) {
                foreach ($list as [$columns, $name]) {
                    $t->index($columns, $name);
                }
            });
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $list) {
            Schema::table($table, function (Blueprint $t) use ($list) {
                foreach ($list as [, $name]) {
                    $t->dropIndex($name);
                }
            });
        }
    }
};
