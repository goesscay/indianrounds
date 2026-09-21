<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('gst_state')->nullable()->after('phone');
            $table->string('google_id')->nullable()->unique()->after('gst_state');
            $table->string('password')->nullable()->change();
        });

        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 16)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tour_id')->constrained();
            $table->foreignId('batch_id')->constrained();
            $table->foreignId('variant_id')->nullable()->constrained('tour_variants')->nullOnDelete();
            $table->string('status')->default('pending_payment'); // pending_payment | confirmed | cancelled | expired
            $table->string('haul_class');
            $table->unsignedSmallInteger('traveller_count');
            $table->unsignedInteger('unit_price');
            $table->unsignedInteger('subtotal');
            $table->decimal('gst_rate', 5, 4);
            $table->unsignedInteger('gst_amount');
            $table->unsignedInteger('total_amount');
            $table->string('gst_state');
            $table->string('contact_name');
            $table->string('contact_phone', 20);
            $table->string('contact_email');
            $table->timestamp('reserved_until')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'reserved_until']);
        });

        Schema::create('booking_travellers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('age')->nullable();
            $table->string('gender', 16)->nullable();
            $table->timestamps();
        });

        Schema::create('payment_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('sequence');
            $table->string('label');
            $table->date('due_on');
            $table->unsignedInteger('amount');
            $table->string('status')->default('due'); // due | paid | cancelled
            $table->string('gateway_order_id')->nullable()->index();
            $table->string('gateway_payment_id')->nullable()->unique();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->unique(['booking_id', 'sequence']);
        });

        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider');
            $table->string('event_id');
            $table->string('type')->nullable();
            $table->timestamps();
            $table->unique(['provider', 'event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('payment_milestones');
        Schema::dropIfExists('booking_travellers');
        Schema::dropIfExists('bookings');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'gst_state', 'google_id']);
        });
    }
};
