<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tours', function (Blueprint $table) {
            // A package without a price is enquiry-only ("Get a Free Quote"). show_price lets staff keep a price
            // on file (e.g. for internal use) without publishing it.
            $table->unsignedInteger('base_price')->nullable()->change();
            $table->boolean('show_price')->default(true)->after('original_price');
        });
    }

    public function down(): void
    {
        DB::table('tours')->whereNull('base_price')->update(['base_price' => 0]);
        Schema::table('tours', function (Blueprint $table) {
            $table->dropColumn('show_price');
            $table->unsignedInteger('base_price')->nullable(false)->change();
        });
    }
};
