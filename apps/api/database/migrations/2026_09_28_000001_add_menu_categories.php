<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Stable key from the client's Package ID, so re-importing updates instead of duplicating.
        Schema::table('tours', function (Blueprint $table) {
            $table->string('code', 60)->nullable()->unique()->after('slug');
        });

        // Browse categories per menu and country, e.g. Honeymoon > Bali > Romantic Escapes.
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('menu', 30); // destinations | group-tours | weekend-escapes | honeymoon
            $table->foreignId('destination_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->string('image_url')->nullable();
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
            $table->unique(['menu', 'destination_id', 'slug']);
        });

        Schema::create('category_tour', function (Blueprint $table) {
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tour_id')->constrained()->cascadeOnDelete();
            $table->primary(['category_id', 'tour_id']);
            $table->index('tour_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_tour');
        Schema::dropIfExists('categories');
        Schema::table('tours', fn (Blueprint $table) => $table->dropColumn('code'));
    }
};
