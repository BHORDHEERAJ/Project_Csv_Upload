<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['uuid', 'user_id', 'session_id', 'file_type', 'processing_stage', 'original_name', 'stored_name', 'file_path', 'file_size', 'mime_type', 'file_hash', 'encoding', 'row_count', 'column_count', 'headers', 'expires_at', 'processed_at', 'downloaded_at', 'download_count', 'status'])]
class File extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'headers' => 'json',
            'expires_at' => 'datetime',
            'processed_at' => 'datetime',
            'downloaded_at' => 'datetime',
            'file_size' => 'integer',
            'row_count' => 'integer',
            'column_count' => 'integer',
            'download_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function processingJobs(): HasMany
    {
        return $this->hasMany(ProcessingJob::class, 'customer_file_id')
            ->orWhere('template_file_id', $this->id)
            ->orWhere('output_file_id', $this->id);
    }

    public function history(): HasMany
    {
        return $this->hasMany(ProcessingHistory::class);
    }

    public function cleanupLogs(): HasMany
    {
        return $this->hasMany(StorageCleanupLog::class);
    }
}
