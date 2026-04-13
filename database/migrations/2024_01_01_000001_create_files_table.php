<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->char('session_id', 32)->nullable();
            $table->enum('file_type', ['customer_input', 'template_csv', 'output_csv', 'output_excel', 'temp_processed']);
            $table->enum('processing_stage', ['uploaded', 'parsing', 'mapping', 'generated', 'archived']);
            $table->string('original_name');
            $table->string('stored_name');
            $table->string('file_path');
            $table->bigInteger('file_size');
            $table->string('mime_type');
            $table->string('file_hash', 64);
            $table->string('encoding')->default('UTF-8');
            $table->integer('row_count')->nullable();
            $table->integer('column_count')->nullable();
            $table->json('headers')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('downloaded_at')->nullable();
            $table->integer('download_count')->default(0);
            $table->enum('status', ['uploaded', 'processing', 'processed', 'failed', 'expired', 'deleted']);
            $table->timestamps();

            $table->index('user_id');
            $table->index('session_id');
            $table->index('file_type');
            $table->index('status');
            $table->index('expires_at');
            $table->index('file_hash');
            $table->fullText('original_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
