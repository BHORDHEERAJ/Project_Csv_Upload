<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('processing_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->char('session_id', 32)->nullable();
            $table->uuid('job_id')->nullable();
            $table->uuid('file_id')->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('job_id')->references('id')->on('processing_jobs')->onDelete('set null');
            $table->foreign('file_id')->references('id')->on('files')->onDelete('set null');
            $table->enum('action_type', [
                'user_login', 'user_logout', 'file_upload', 'file_download', 'file_delete',
                'processing_start', 'processing_complete', 'processing_failed',
                'config_create', 'config_update', 'config_delete',
                'export_csv', 'export_excel', 'session_delete',
                'quota_warning', 'system_cleanup', 'backup_created', 'error_occurred'
            ]);
            $table->enum('action_status', ['success', 'failed', 'pending', 'cancelled']);
            $table->json('details')->nullable();
            $table->string('ip_address', 45);
            $table->text('user_agent')->nullable();
            $table->text('referer_url')->nullable();
            $table->integer('execution_time_ms')->nullable();
            $table->integer('memory_used_mb')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('session_id');
            $table->index('action_type');
            $table->index('created_at');
            $table->index(['user_id', 'action_type'], 'user_action_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processing_history');
    }
};
