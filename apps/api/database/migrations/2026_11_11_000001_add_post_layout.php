<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            // Per-article page layout chosen in the admin (hero style, sidebar, which blocks to show). Null = defaults.
            $table->json('layout')->nullable()->after('key_facts');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('layout');
        });
    }
};
