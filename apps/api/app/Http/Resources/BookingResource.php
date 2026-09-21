<?php

namespace App\Http\Resources;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Booking */
class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'reference' => $this->reference,
            'status' => $this->status,
            'traveller_count' => $this->traveller_count,
            'unit_price' => $this->unit_price,
            'subtotal' => $this->subtotal,
            'gst_rate' => $this->gst_rate,
            'gst_amount' => $this->gst_amount,
            'total_amount' => $this->total_amount,
            'paid_amount' => $this->paid_amount,
            'credit_applied' => $this->credit_applied,
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'cancellation_deduction' => $this->cancellation_deduction,
            'cancellation_outcome' => $this->cancellation_outcome,
            'gst_state' => $this->gst_state,
            'reserved_until' => $this->reserved_until?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
            'contact' => ['name' => $this->contact_name, 'phone' => $this->contact_phone, 'email' => $this->contact_email],
            'tour' => ['title' => $this->tour->title, 'slug' => $this->tour->slug, 'duration_nights' => $this->tour->duration_nights],
            'variant' => $this->variant?->label,
            'departure' => ['starts_on' => $this->batch->starts_on->toDateString(), 'ends_on' => $this->batch->ends_on->toDateString()],
            'travellers' => $this->travellers->map(fn ($t) => ['name' => $t->name, 'age' => $t->age, 'gender' => $t->gender])->values(),
            'milestones' => $this->milestones->map(fn ($m) => [
                'id' => $m->id,
                'sequence' => $m->sequence,
                'label' => $m->label,
                'due_on' => $m->due_on->toDateString(),
                'amount' => $m->amount,
                'status' => $m->status,
                'paid_at' => $m->paid_at?->toIso8601String(),
            ])->values(),
        ];
    }
}
