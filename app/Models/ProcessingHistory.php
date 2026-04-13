<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['uuid', 'user_id', 'session_id', 'job_id', 'file_id', 'action_type', 'action_status', 'details', 'ip_address', 'user_agent', 'referer_url', 'execution_time_ms', 'memory_used_mb'])]
class ProcessingHistory extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'processing_history';

    protected function casts(): array
    {
        return [
            'details' => 'json',
            'execution_time_ms' => 'integer',
            'memory_used_mb' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(ProcessingJob::class, 'job_id');
    }

    public function file(): BelongsTo
    {
        return $this->belongsTo(File::class);
    }
}
