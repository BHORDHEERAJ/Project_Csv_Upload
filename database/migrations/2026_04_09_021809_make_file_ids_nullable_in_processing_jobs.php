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
            $table->uuid('customer_file_id')->nullable()->change();
            $table->uuid('template_file_id')->nullable()->change();
            $table->json('source_columns')->nullable();
            $table->string('mapping_config_name')->nullable()->change();
            $table->integer('mapping_config_version')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('processing_jobs', function (Blueprint $table) {
            $table->uuid('customer_file_id')->nullable(false)->change();
            $table->uuid('template_file_id')->nullable(false)->change();
        });
    }
};
