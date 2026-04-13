<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('processing_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->char('session_id', 32)->nullable();
            $table->uuid('customer_file_id')->nullable();
            $table->uuid('template_file_id')->nullable();
            $table->uuid('output_file_id')->nullable();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('customer_file_id')->references('id')->on('files')->onDelete('cascade');
            $table->foreign('template_file_id')->references('id')->on('files')->onDelete('cascade');
            $table->foreign('output_file_id')->references('id')->on('files')->onDelete('set null');
            $table->string('mapping_config_name');
            $table->integer('mapping_config_version');
            $table->json('custom_rules')->nullable();
            $table->tinyInteger('priority')->default(5);
            $table->string('queue_name')->nullable();
            $table->enum('status', ['pending', 'queued', 'parsing', 'extracting', 'mapping', 'generating', 'completed', 'failed', 'cancelled']);
            $table->integer('progress')->default(0);
            $table->string('current_stage')->nullable();
            $table->json('extracted_data')->nullable();
            $table->json('mapped_data')->nullable();
            $table->json('template_headers')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->integer('processing_time')->description('in seconds')->default(0);
            $table->integer('memory_used')->description('in MB')->default(0);
            $table->text('error_message')->nullable();
            $table->text('error_stack')->nullable();
            $table->integer('retry_count')->default(0);
            $table->integer('max_retries')->default(3);
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'priority']);
            $table->index('session_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processing_jobs');
    }
};
