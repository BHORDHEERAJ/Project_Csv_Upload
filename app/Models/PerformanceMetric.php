<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['metric_type', 'metric_value', 'metric_unit', 'job_id', 'user_id', 'endpoint', 'query_type', 'tags', 'threshold_value', 'is_above_threshold', 'recorded_at'])]
class PerformanceMetric extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'metric_value' => 'decimal:2',
            'threshold_value' => 'decimal:2',
            'is_above_threshold' => 'boolean',
            'tags' => 'json',
            'recorded_at' => 'datetime',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(ProcessingJob::class, 'job_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
