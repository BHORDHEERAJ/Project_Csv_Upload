<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['setting_key', 'setting_value', 'setting_type', 'category', 'display_name', 'description', 'validation_rules', 'is_editable', 'is_public', 'is_encrypted', 'version', 'last_modified_by'])]
class SystemSetting extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'validation_rules' => 'json',
            'is_editable' => 'boolean',
            'is_public' => 'boolean',
            'is_encrypted' => 'boolean',
            'version' => 'integer',
        ];
    }

    public function modifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_modified_by');
    }
}
