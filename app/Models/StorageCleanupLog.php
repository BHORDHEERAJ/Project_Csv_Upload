<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['file_id', 'user_id', 'session_id', 'file_path', 'file_name', 'file_size', 'file_type', 'cleanup_reason', 'retention_days', 'age_at_deletion', 'triggered_by', 'trigger_type', 'space_freed_mb', 'total_files_cleaned', 'cleaned_at'])]
class StorageCleanupLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'retention_days' => 'integer',
            'age_at_deletion' => 'integer',
            'space_freed_mb' => 'decimal:2',
            'total_files_cleaned' => 'integer',
            'cleaned_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }
}
