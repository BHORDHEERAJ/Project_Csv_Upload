<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['uuid', 'user_id', 'type', 'title', 'message', 'action_url', 'action_text', 'metadata', 'is_read', 'read_at', 'is_dismissed', 'email_sent', 'email_sent_at', 'expires_at'])]
class Notification extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'metadata' => 'json',
            'is_read' => 'boolean',
            'is_dismissed' => 'boolean',
            'email_sent' => 'boolean',
            'read_at' => 'datetime',
            'email_sent_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
