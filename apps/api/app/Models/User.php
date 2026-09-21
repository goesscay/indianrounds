<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /** @var array<string, mixed> */
    protected $attributes = ['is_active' => true];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'gst_state',
        'google_id',
        'department',
        'staff_tier',
        'is_active',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'google_id',
        'password',
        'remember_token',
    ];

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
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<Booking, $this> */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function isStaff(): bool
    {
        return $this->staff_tier !== null && $this->is_active;
    }

    /** @return array{tier: string, department: string|null, department_label: string|null, permissions: list<string>}|null */
    public function staffProfile(): ?array
    {
        if ($this->staff_tier === null) {
            return null;
        }

        return [
            'tier' => $this->staff_tier,
            'department' => $this->department,
            'department_label' => $this->department ? config("rbac.departments.{$this->department}.label") : null,
            'permissions' => $this->getAllPermissions()->pluck('name')->values()->all(),
        ];
    }
}
