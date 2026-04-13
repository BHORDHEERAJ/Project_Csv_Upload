<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('setting_key')->unique();
            $table->text('setting_value');
            $table->enum('setting_type', ['string', 'integer', 'boolean', 'json', 'array']);
            $table->string('category')->nullable();
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->json('validation_rules')->nullable();
            $table->boolean('is_editable')->default(true);
            $table->boolean('is_public')->default(false);
            $table->boolean('is_encrypted')->default(false);
            $table->integer('version')->default(1);
            $table->uuid('last_modified_by')->nullable();

            $table->foreign('last_modified_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamps();

            $table->index('category');
            $table->index('setting_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
