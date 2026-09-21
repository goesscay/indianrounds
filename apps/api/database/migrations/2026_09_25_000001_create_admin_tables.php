<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('department')->nullable()->index();
            $table->string('staff_tier')->nullable()->index(); // admin | staff; null for customers
            $table->boolean('is_active')->default(true);
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
        });

        Schema::table('refunds', function (Blueprint $table) {
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->string('reference')->nullable();
        });

        Schema::table('grievances', function (Blueprint $table) {
            $table->text('resolution')->nullable();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // refund_process | credit_note_issue
            $table->json('payload');
            $table->unsignedInteger('amount')->default(0);
            $table->string('summary');
            $table->foreignId('requested_by')->constrained('users');
            $table->string('status')->default('pending'); // pending | approved | rejected
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->text('decision_note')->nullable();
            $table->timestamps();
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_requests');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('audit_logs');
        Schema::table('grievances', fn (Blueprint $t) => $t->dropColumn('resolution'));
        Schema::table('refunds', function (Blueprint $t) {
            $t->dropConstrainedForeignId('processed_by');
            $t->dropColumn(['processed_at', 'reference']);
        });
        Schema::table('leads', function (Blueprint $t) {
            $t->dropConstrainedForeignId('assigned_to');
            $t->dropColumn('notes');
        });
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['department', 'staff_tier', 'is_active']));
    }
};
