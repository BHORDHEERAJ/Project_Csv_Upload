<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['uuid', 'name', 'display_name', 'description', 'version', 'document_type', 'mapping_rules', 'default_values', 'transformations', 'validation_rules', 'usage_count', 'success_count', 'last_used_at', 'is_active', 'is_public', 'is_system', 'created_by'])]
class MappingConfiguration extends Model
{
    use HasFactory, HasUuids;

    protected function casts(): array
    {
        return [
            'mapping_rules' => 'json',
            'default_values' => 'json',
            'transformations' => 'json',
            'validation_rules' => 'json',
            'version' => 'integer',
            'usage_count' => 'integer',
            'success_count' => 'integer',
            'last_used_at' => 'datetime',
            'is_active' => 'boolean',
            'is_public' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
