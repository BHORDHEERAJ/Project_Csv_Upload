<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('processing_jobs', function (Blueprint $table) {
            $table->json('source_columns')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('processing_jobs', function (Blueprint $table) {
            $table->dropColumn('source_columns');
        });
    }
};
