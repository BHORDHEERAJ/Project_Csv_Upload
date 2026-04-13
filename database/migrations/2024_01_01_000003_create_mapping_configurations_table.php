<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mapping_configurations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->integer('version')->default(1);
            $table->enum('document_type', ['price_list', 'invoice', 'quotation', 'work_order', 'purchase_order', 'custom']);
            $table->json('mapping_rules');
            $table->json('default_values')->nullable();
            $table->json('transformations')->nullable();
            $table->json('validation_rules')->nullable();
            $table->integer('usage_count')->default(0);
            $table->integer('success_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(false);
            $table->boolean('is_system')->default(false);
            $table->uuid('created_by');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['name', 'version']);
            $table->fullText(['name', 'description']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mapping_configurations');
    }
};
