<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marathi_ocr_cache', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('file_hash', 64);
            $table->integer('page_number')->default(1);
            $table->longText('extracted_text')->nullable();
            $table->decimal('confidence_score', 5, 2)->nullable();
            $table->string('language_used')->default('eng+mar');
            $table->integer('processing_time_ms')->nullable();
            $table->json('image_dimensions')->nullable();
            $table->integer('usage_count')->default(1);
            $table->timestamp('last_accessed_at')->useCurrent();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->unique(['file_hash', 'page_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marathi_ocr_cache');
    }
};
