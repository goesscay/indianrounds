<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Lead;
use App\Models\PaymentMilestone;
use App\Models\Tour;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\GrowthSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminReportsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(CatalogueSeeder::class);
    }

    private function staff(string $dept, string $tier = 'staff'): User
    {
        $u = User::factory()->create(['department' => $dept, 'staff_tier' => $tier, 'is_active' => true]);
        $u->assignRole("{$dept}.{$tier}");
        Sanctum::actingAs($u, ['staff']);

        return $u;
    }

    private function booking(array $overrides = []): Booking
    {
        $tour = Tour::query()->where('slug', 'kashmir-delight')->firstOrFail();
        $batch = $tour->batches()->firstOrFail();
        $user = isset($overrides['user_id']) ? User::query()->findOrFail($overrides['user_id']) : User::factory()->create();

        return Booking::create(array_merge([
            'reference' => 'IR'.random_int(100000, 999999),
            'user_id' => $user->id,
            'tour_id' => $tour->id,
            'batch_id' => $batch->id,
            'status' => 'confirmed',
            'haul_class' => 'short',
            'traveller_count' => 2,
            'unit_price' => 24999,
            'subtotal' => 49998,
            'gst_rate' => 0.05,
            'gst_amount' => 2500,
            'total_amount' => 52498,
            'gst_state' => 'Tamil Nadu',
            'contact_name' => $user->name,
            'contact_phone' => '9876543210',
            'contact_email' => $user->email,
            'confirmed_at' => now(),
        ], $overrides));
    }

    // Permission gates

    public function test_each_report_requires_its_own_permission(): void
    {
        $this->staff('hr'); // a department with none of the report permissions

        $this->getJson('/api/v1/admin/reports/bookings')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/sales')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/payments')->assertForbidden();
        $this->getJson('/api/v1/admin/reports/customers')->assertForbidden();
    }

    // Bookings

    public function test_booking_report_summary_and_breakdowns(): void
    {
        $this->booking(['status' => 'confirmed', 'total_amount' => 10000, 'traveller_count' => 2]);
        $this->booking(['status' => 'confirmed', 'total_amount' => 20000, 'traveller_count' => 3]);
        $this->booking(['status' => 'pending_payment']);
        $this->booking(['status' => 'cancelled']);

        $this->staff('operations');
        $res = $this->getJson('/api/v1/admin/reports/bookings')->assertOk()->json('data');

        $this->assertSame(4, $res['summary']['total']);
        $this->assertSame(2, $res['summary']['confirmed']);
        $this->assertSame(1, $res['summary']['pending']);
        $this->assertSame(1, $res['summary']['cancelled']);
        $this->assertSame(5, $res['summary']['total_travellers']);
        $this->assertSame(30000, $res['summary']['total_revenue']);
        $this->assertSame(15000, $res['summary']['avg_booking_value']);

        $kashmir = collect($res['top_destinations'])->firstWhere('destination', 'India');
        $this->assertNotNull($kashmir);
        $this->assertSame(2, $kashmir['count']);
        $this->assertSame(30000, $kashmir['revenue']);

        $thisMonth = collect($res['by_month'])->last();
        $this->assertSame(4, $thisMonth['count']);
        $this->assertSame(30000, $thisMonth['revenue']);
    }

    // Sales / leads, with department scoping mirroring the leads list itself

    public function test_sales_report_is_scoped_by_department_like_the_leads_list(): void
    {
        Lead::create(['name' => 'A', 'country_code' => '+91', 'phone' => '9000000001', 'source' => 'callback', 'status' => 'won']);
        Lead::create(['name' => 'B', 'country_code' => '+91', 'phone' => '9000000002', 'source' => 'corporate', 'status' => 'new', 'company' => 'Acme']);
        Lead::create(['name' => 'C', 'country_code' => '+91', 'phone' => '9000000003', 'source' => 'custom', 'status' => 'lost']);

        $this->staff('corporate');
        $res = $this->getJson('/api/v1/admin/reports/sales')->assertOk()->json('data');
        $this->assertSame(1, $res['summary']['total']);
        $this->assertSame(['corporate'], collect($res['by_source'])->pluck('source')->all());

        $this->staff('sales', 'admin');
        $res = $this->getJson('/api/v1/admin/reports/sales')->assertOk()->json('data');
        $this->assertSame(3, $res['summary']['total']);
        $this->assertSame(1, $res['summary']['won']);
        $this->assertEqualsWithDelta(33.3, $res['summary']['conversion_rate'], 0.1);
    }

    // Payments

    public function test_payment_report_collected_due_and_overdue(): void
    {
        $b = $this->booking();
        PaymentMilestone::create(['booking_id' => $b->id, 'sequence' => 1, 'label' => 'Advance', 'due_on' => now()->subDays(10), 'amount' => 13125, 'status' => 'paid', 'paid_at' => now()]);
        PaymentMilestone::create(['booking_id' => $b->id, 'sequence' => 2, 'label' => 'Instalment', 'due_on' => now()->subDays(1), 'amount' => 13124, 'status' => 'due']);
        PaymentMilestone::create(['booking_id' => $b->id, 'sequence' => 3, 'label' => 'Final', 'due_on' => now()->addDays(20), 'amount' => 13125, 'status' => 'due']);

        $this->staff('finance');
        $res = $this->getJson('/api/v1/admin/reports/payments')->assertOk()->json('data');

        $this->assertSame(13125, $res['summary']['total_collected']);
        $this->assertSame(26249, $res['summary']['total_due']);
        $this->assertSame(13124, $res['summary']['overdue_amount']);
        $this->assertSame(1, $res['summary']['overdue_count']);

        $thisMonth = collect($res['by_month'])->last();
        $this->assertSame(13125, $thisMonth['collected']);
    }

    // Customers

    public function test_customer_report_repeat_and_top_spenders(): void
    {
        $loyal = User::factory()->create(['name' => 'Loyal Traveller']);
        $this->booking(['user_id' => $loyal->id, 'total_amount' => 40000]);
        $this->booking(['user_id' => $loyal->id, 'total_amount' => 60000]);
        User::factory()->create(); // a one-time customer, no bookings

        $this->staff('sales', 'admin');
        $res = $this->getJson('/api/v1/admin/reports/customers')->assertOk()->json('data');

        $this->assertSame(2, $res['summary']['total']);
        $this->assertSame(1, $res['summary']['repeat_customers']);
        $this->assertEqualsWithDelta(50.0, $res['summary']['repeat_rate'], 0.1);
        $this->assertSame('Loyal Traveller', $res['top_customers'][0]['name']);
        $this->assertSame(100000, $res['top_customers'][0]['total_spend']);
    }

    // Tour categories

    public function test_tour_categories_lists_tagged_tours_including_drafts(): void
    {
        $this->seed(GrowthSeeder::class);
        Tour::where('slug', 'pondicherry-weekend')->update(['status' => 'draft']);

        $this->staff('operations');
        $data = $this->getJson('/api/v1/admin/tour-categories')->assertOk()->json('data');

        $weekend = collect($data)->firstWhere('slug', 'weekend-getaways');
        $this->assertNotNull($weekend);
        $slugs = collect($weekend['tours'])->pluck('slug');
        $this->assertContains('pondicherry-weekend', $slugs, 'drafts must still show up for staff');
        $this->assertLessThan($weekend['tours_count'], $weekend['published_count']);

        $pondy = collect($weekend['tours'])->firstWhere('slug', 'pondicherry-weekend');
        $this->assertSame('draft', $pondy['status']);
    }

    public function test_tour_categories_requires_tours_permission(): void
    {
        $this->staff('hr');
        $this->getJson('/api/v1/admin/tour-categories')->assertForbidden();
    }
}
