<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->unsignedInteger('credit_applied')->default(0)->after('total_amount');
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedInteger('cancellation_deduction')->nullable();
            $table->string('cancellation_outcome')->nullable(); // credit_note | refund | none
        });

        Schema::table('payment_milestones', function (Blueprint $table) {
            $table->timestamp('reminded_at')->nullable();
        });

        Schema::create('credit_notes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_booking_id')->constrained('bookings');
            $table->unsignedInteger('amount');
            $table->string('currency', 3)->default('INR');
            $table->date('issued_on');
            $table->date('expires_on');
            $table->string('status')->default('active'); // active | redeemed | expired
            $table->foreignId('redeemed_booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamps();
        });

        // Refund requests (used when CANCELLATION_MODE=refund); processed by staff in the admin phase.
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained();
            $table->foreignId('user_id')->constrained();
            $table->unsignedInteger('amount');
            $table->string('status')->default('pending'); // pending | processed | rejected
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('grievances', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 16)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject');
            $table->text('description');
            $table->unsignedTinyInteger('stage')->default(1); // 1 support, 2 escalation, 3 final
            $table->string('status')->default('open'); // open | resolved
            $table->string('officer_name')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('ack_due_at');
            $table->timestamp('resolve_by');
            $table->timestamp('statutory_deadline');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grievances');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('credit_notes');
        Schema::table('payment_milestones', fn (Blueprint $t) => $t->dropColumn('reminded_at'));
        Schema::table('bookings', fn (Blueprint $t) => $t->dropColumn(['credit_applied', 'cancelled_at', 'cancellation_deduction', 'cancellation_outcome']));
    }
};
