<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('storage_cleanup_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('file_id')->nullable();
            $table->uuid('user_id')->nullable();

            $table->foreign('file_id')->references('id')->on('files')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->char('session_id', 32)->nullable();
            $table->string('file_path');
            $table->string('file_name');
            $table->bigInteger('file_size');
            $table->string('file_type');
            $table->enum('cleanup_reason', ['expired', 'manual_user', 'manual_admin', 'quota_exceeded', 'system_error', 'replaced', 'temp_cleanup']);
            $table->integer('retention_days')->default(30);
            $table->integer('age_at_deletion')->nullable();
            $table->string('triggered_by');
            $table->enum('trigger_type', ['cron_job', 'user_action', 'system_event', 'manual_command']);
            $table->decimal('space_freed_mb', 10, 2)->nullable();
            $table->integer('total_files_cleaned')->nullable();
            $table->timestamp('cleaned_at')->useCurrent();

            $table->index('file_id');
            $table->index('user_id');
            $table->index('cleanup_reason');
            $table->index('cleaned_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('storage_cleanup_logs');
    }
};
