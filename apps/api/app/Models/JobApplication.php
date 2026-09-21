<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $job_opening_id
 * @property string $name
 * @property string $email
 * @property string|null $resume_path
 * @property string|null $resume_name
 * @property string $status
 * @property Carbon $created_at
 */
class JobApplication extends Model
{
    protected $guarded = [];

    /** @return BelongsTo<JobOpening, $this> */
    public function opening(): BelongsTo
    {
        return $this->belongsTo(JobOpening::class, 'job_opening_id');
    }
}
