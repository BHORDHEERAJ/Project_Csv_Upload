<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['file_hash', 'page_number', 'extracted_text', 'confidence_score', 'language_used', 'processing_time_ms', 'image_dimensions', 'usage_count', 'last_accessed_at', 'expires_at'])]
class MarathiOcrCache extends Model
{
    use HasFactory;

    protected $table = 'marathi_ocr_cache';

    protected function casts(): array
    {
        return [
            'confidence_score' => 'decimal:2',
            'processing_time_ms' => 'integer',
            'image_dimensions' => 'json',
            'usage_count' => 'integer',
            'last_accessed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }
}
