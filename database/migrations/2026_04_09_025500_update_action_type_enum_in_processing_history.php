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
        Schema::table('processing_history', function (Blueprint $table) {
            $table->enum('action_type', [
                'upload', 'parsing', 'mapping', 'generating', 
                'download', 'config_update', 'system', 
                'extraction', 'export'
            ])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('processing_history', function (Blueprint $table) {
            $table->enum('action_type', ['upload', 'parsing', 'mapping', 'generating', 'download', 'config_update', 'system'])->change();
        });
    }
};
