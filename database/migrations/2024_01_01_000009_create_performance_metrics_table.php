<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('performance_metrics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('metric_type', [
                'processing_time', 'memory_usage', 'cpu_usage', 'disk_usage',
                'api_response_time', 'database_query_time', 'queue_size',
                'file_upload_time', 'ocr_processing_time'
            ]);
            $table->decimal('metric_value', 10, 2);
            $table->string('metric_unit', 20);
            $table->uuid('job_id')->nullable();
            $table->uuid('user_id')->nullable();

            $table->foreign('job_id')->references('id')->on('processing_jobs')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->string('endpoint')->nullable();
            $table->string('query_type')->nullable();
            $table->json('tags')->nullable();
            $table->decimal('threshold_value', 10, 2)->nullable();
            $table->boolean('is_above_threshold')->default(false);
            $table->timestamp('recorded_at')->useCurrent();

            $table->index('metric_type');
            $table->index('recorded_at');
            $table->index(['metric_type', 'recorded_at'], 'type_date_index');
            $table->index('is_above_threshold');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('performance_metrics');
    }
};
