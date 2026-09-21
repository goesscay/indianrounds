<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('destinations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('region')->default('international'); // india | international
            $table->string('tagline')->nullable();
            $table->unsignedInteger('starting_price')->nullable();
            $table->string('image_url')->nullable();
            $table->string('best_time')->nullable();
            $table->json('seo_content')->nullable();
            $table->boolean('featured')->default(false);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('tours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('destination_id')->constrained()->cascadeOnDelete();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('summary', 500)->nullable();
            $table->string('tour_type')->default('group'); // group | custom
            $table->string('haul_class')->default('short'); // short | long
            $table->unsignedSmallInteger('duration_nights');
            $table->string('pickup')->nullable();
            $table->string('drop_point')->nullable();
            $table->text('overview')->nullable();
            $table->json('highlights')->nullable();
            $table->json('itinerary')->nullable();
            $table->json('inclusions')->nullable();
            $table->json('exclusions')->nullable();
            $table->json('notes')->nullable();
            $table->json('must_carry')->nullable();
            $table->string('image_url')->nullable();
            $table->json('gallery')->nullable();
            $table->unsignedInteger('base_price');
            $table->unsignedInteger('original_price')->nullable();
            $table->boolean('featured')->default(false);
            $table->string('status')->default('published'); // draft | published
            $table->timestamps();
            $table->index(['status', 'featured']);
        });

        Schema::create('tour_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->unsignedInteger('original_price')->nullable();
            $table->unsignedInteger('price');
            $table->timestamps();
        });

        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $table->date('starts_on');
            $table->date('ends_on');
            $table->unsignedSmallInteger('capacity');
            $table->unsignedSmallInteger('seats_booked')->default(0);
            $table->string('status')->default('open'); // open | sold_out
            $table->timestamps();
            $table->index(['tour_id', 'starts_on']);
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE batches ADD CONSTRAINT batches_seats_within_capacity CHECK (seats_booked <= capacity)');
        }

        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('location')->nullable();
            $table->unsignedTinyInteger('rating')->default(5);
            $table->text('quote');
            $table->string('avatar_url')->nullable();
            $table->boolean('featured')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('country_code', 8)->default('+91');
            $table->string('phone', 20);
            $table->string('email')->nullable();
            $table->string('destination')->nullable();
            $table->unsignedSmallInteger('travellers')->nullable();
            $table->date('travel_date')->nullable();
            $table->text('message')->nullable();
            $table->string('source')->default('callback'); // callback | quote | itinerary | contact
            $table->string('page')->nullable();
            $table->string('status')->default('new');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['leads', 'testimonials', 'batches', 'tour_variants', 'tours', 'destinations'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
