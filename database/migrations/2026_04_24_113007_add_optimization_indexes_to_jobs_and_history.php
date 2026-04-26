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
            $table->index(['user_id', 'created_at'], 'jobs_user_created_at_index');
        });

        Schema::table('processing_history', function (Blueprint $table) {
            $table->index(['user_id', 'created_at'], 'history_user_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('processing_history', function (Blueprint $table) {
            $table->dropIndex('history_user_created_at_index');
        });

        Schema::table('processing_jobs', function (Blueprint $table) {
            $table->dropIndex('jobs_user_created_at_index');
        });
    }
};
