<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tours', function (Blueprint $table) {
            $table->json('tags')->nullable();
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->string('company')->nullable();
            $table->json('details')->nullable();
        });

        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('excerpt', 500)->nullable();
            $table->longText('body');
            $table->string('content_type')->default('general');
            $table->foreignId('destination_id')->nullable()->constrained()->nullOnDelete();
            $table->string('author_name');
            $table->string('cover_image_url')->nullable();
            $table->unsignedSmallInteger('read_minutes')->default(1);
            $table->string('meta_description', 300)->nullable();
            $table->string('status')->default('draft'); // draft | published
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'published_at']);
        });

        Schema::create('case_studies', function (Blueprint $table) {
            $table->id();
            $table->string('client_name');
            $table->string('destination');
            $table->unsignedSmallInteger('headcount');
            $table->text('blurb');
            $table->text('quote')->nullable();
            $table->string('quote_name')->nullable();
            $table->string('quote_title')->nullable();
            $table->boolean('published')->default(false);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('job_openings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('department')->nullable();
            $table->string('location')->nullable();
            $table->string('employment_type')->default('Full-time');
            $table->text('description');
            $table->string('status')->default('open'); // open | closed
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_opening_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('phone', 20);
            $table->string('gender', 16)->nullable();
            $table->unsignedTinyInteger('age')->nullable();
            $table->string('profile_url')->nullable();
            $table->text('experience');
            $table->text('message')->nullable();
            $table->string('resume_path')->nullable();
            $table->string('resume_name')->nullable();
            $table->string('status')->default('new'); // new | shortlisted | rejected | hired
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
        Schema::dropIfExists('job_openings');
        Schema::dropIfExists('case_studies');
        Schema::dropIfExists('posts');
        Schema::table('leads', fn (Blueprint $t) => $t->dropColumn(['company', 'details']));
        Schema::table('tours', fn (Blueprint $t) => $t->dropColumn('tags'));
    }
};
