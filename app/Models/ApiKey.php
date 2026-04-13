<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;

#[Fillable(['uuid', 'user_id', 'name', 'api_key', 'api_key_preview', 'permissions', 'rate_limit_per_minute', 'rate_limit_per_hour', 'rate_limit_per_day', 'last_used_at', 'total_requests', 'is_active', 'expires_at', 'allowed_ips', 'allowed_origins'])]
#[Hidden(['api_key'])]
class ApiKey extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected function casts(): array
    {
        return [
            'permissions' => 'json',
            'allowed_ips' => 'json',
            'allowed_origins' => 'json',
            'rate_limit_per_minute' => 'integer',
            'rate_limit_per_hour' => 'integer',
            'rate_limit_per_day' => 'integer',
            'total_requests' => 'integer',
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
