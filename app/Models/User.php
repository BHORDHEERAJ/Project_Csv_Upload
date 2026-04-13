<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'uuid', 'api_token', 'two_factor_secret', 'two_factor_recovery_codes', 'storage_limit', 'storage_used', 'account_tier', 'total_uploads', 'total_processing_time', 'last_login_at', 'last_login_ip'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, HasUuids, SoftDeletes;

    /**
     * @return HasMany<File>
     */
    public function files(): HasMany
    {
        return $this->hasMany(File::class);
    }

    /**
     * @return HasMany<ProcessingJob>
     */
    public function processingJobs(): HasMany
    {
        return $this->hasMany(ProcessingJob::class);
    }

    /**
     * @return HasMany<ApiKey>
     */
    public function apiKeys(): HasMany
    {
        return $this->hasMany(ApiKey::class);
    }

    /**
     * @return HasMany<Notification>
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * @return HasMany<ProcessingHistory>
     */
    public function processingHistory(): HasMany
    {
        return $this->hasMany(ProcessingHistory::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'storage_limit' => 'integer',
            'storage_used' => 'integer',
            'total_uploads' => 'integer',
            'total_processing_time' => 'decimal:2',
            'last_login_at' => 'datetime',
        ];
    }
}
