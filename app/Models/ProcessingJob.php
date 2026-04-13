<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['uuid', 'user_id', 'session_id', 'customer_file_id', 'template_file_id', 'output_file_id', 'mapping_config_name', 'mapping_config_version', 'custom_rules', 'priority', 'queue_name', 'status', 'progress', 'current_stage', 'extracted_data', 'mapped_data', 'template_headers', 'source_columns', 'mapping', 'started_at', 'completed_at', 'processing_time', 'memory_used', 'error_message', 'error_stack', 'retry_count', 'max_retries'])]
class ProcessingJob extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'custom_rules' => 'json',
            'extracted_data' => 'json',
            'mapped_data' => 'json',
            'template_headers' => 'json',
            'source_columns' => 'json',
            'mapping' => 'json',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'progress' => 'integer',
            'priority' => 'integer',
            'processing_time' => 'integer',
            'memory_used' => 'integer',
            'retry_count' => 'integer',
            'max_retries' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customerFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'customer_file_id');
    }

    public function templateFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'template_file_id');
    }

    public function outputFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'output_file_id');
    }
}
