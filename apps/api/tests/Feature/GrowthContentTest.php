<?php

namespace Tests\Feature;

use App\Models\CaseStudy;
use App\Models\Destination;
use App\Models\JobApplication;
use App\Models\JobOpening;
use App\Models\Lead;
use App\Models\Post;
use App\Models\Tour;
use App\Models\User;
use Database\Seeders\CatalogueSeeder;
use Database\Seeders\GrowthSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GrowthContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(CatalogueSeeder::class);
        $this->seed(GrowthSeeder::class);
    }

    private function staff(string $dept, string $tier = 'staff'): User
    {
        $u = User::factory()->create(['department' => $dept, 'staff_tier' => $tier, 'is_active' => true]);
        $u->assignRole("{$dept}.{$tier}");
        Sanctum::actingAs($u, ['staff']);

        return $u;
    }

    // Blog

    public function test_public_blog_lists_only_published_posts_with_filters(): void
    {
        Post::create(['title' => 'Draft one', 'slug' => 'draft-one', 'body' => 'x', 'author_name' => 'A', 'status' => 'draft']);
        Post::create(['title' => 'Future one', 'slug' => 'future-one', 'body' => 'x', 'author_name' => 'A', 'status' => 'published', 'published_at' => now()->addDay()]);

        $slugs = collect($this->getJson('/api/v1/posts?per_page=24')->assertOk()->json('data'))->pluck('slug');
        $this->assertNotContains('draft-one', $slugs);
        $this->assertNotContains('future-one', $slugs);
        $this->assertContains('best-time-to-visit-kashmir', $slugs);

        $bali = collect($this->getJson('/api/v1/posts?destination=bali')->json('data'));
        $this->assertSame(['seven-things-to-do-in-bali'], $bali->pluck('slug')->all());

        $types = collect($this->getJson('/api/v1/posts?type=places_to_eat')->json('data'))->pluck('content_type')->unique()->all();
        $this->assertSame(['places_to_eat'], $types);
        $this->getJson('/api/v1/posts?type=nonsense')->assertUnprocessable();
    }

    public function test_post_detail_has_body_read_time_author_and_related(): void
    {
        $res = $this->getJson('/api/v1/posts/best-time-to-visit-kashmir')->assertOk();

        $res->assertJsonStructure(['data' => ['title', 'body', 'author_name', 'read_minutes', 'published_at', 'related']]);
        $this->assertGreaterThanOrEqual(1, $res->json('data.read_minutes'));
        $this->assertNotEmpty($res->json('data.related'));
        $this->getJson('/api/v1/posts/does-not-exist')->assertNotFound();
        Post::create(['title' => 'Hidden', 'slug' => 'hidden', 'body' => 'x', 'author_name' => 'A', 'status' => 'draft']);
        $this->getJson('/api/v1/posts/hidden')->assertNotFound();
    }

    public function test_read_time_is_computed_from_length(): void
    {
        $long = Post::create(['title' => 'Long', 'slug' => 'long', 'body' => str_repeat('word ', 650), 'author_name' => 'A']);
        $short = Post::create(['title' => 'Short', 'slug' => 'short', 'body' => 'a few words', 'author_name' => 'A']);

        $this->assertSame(4, $long->read_minutes);
        $this->assertSame(1, $short->read_minutes);
    }

    public function test_content_staff_draft_but_only_admin_publishes(): void
    {
        $staff = $this->staff('content');
        $id = $this->postJson('/api/v1/admin/posts', ['title' => 'My New Guide', 'body' => 'Hello world'])
            ->assertCreated()->assertJsonPath('data.status', 'draft')->assertJsonPath('data.author_name', $staff->name)->json('data.id');

        $this->postJson('/api/v1/admin/posts', ['title' => 'Straight to live', 'body' => 'x', 'status' => 'published'])->assertUnprocessable();
        $this->putJson("/api/v1/admin/posts/{$id}", ['status' => 'published'])->assertUnprocessable();
        $this->deleteJson("/api/v1/admin/posts/{$id}")->assertForbidden();
        $this->getJson('/api/v1/posts/my-new-guide')->assertNotFound();

        $this->staff('content', 'admin');
        $this->putJson("/api/v1/admin/posts/{$id}", ['status' => 'published'])->assertOk()->assertJsonPath('data.status', 'published');
        $this->getJson('/api/v1/posts/my-new-guide')->assertOk();
        $this->assertDatabaseHas('audit_logs', ['action' => 'post.updated', 'subject_id' => $id]);

        $this->deleteJson("/api/v1/admin/posts/{$id}")->assertOk();
    }

    public function test_other_departments_cannot_edit_posts(): void
    {
        $this->staff('finance');

        $this->getJson('/api/v1/admin/posts')->assertForbidden();
        $this->postJson('/api/v1/admin/posts', ['title' => 'x', 'body' => 'y'])->assertForbidden();
    }

    // Collections

    public function test_collections_list_tours_by_tag(): void
    {
        $index = $this->getJson('/api/v1/collections')->assertOk()->json();
        $this->assertContains('weekend', $index['tags']);
        $weekend = collect($index['data'])->firstWhere('slug', 'weekend-getaways');
        $this->assertGreaterThanOrEqual(2, $weekend['tours_count']);

        $slugs = collect($this->getJson('/api/v1/collections/weekend-getaways')->assertOk()->json('data.tours'))->pluck('slug');
        $this->assertContains('pondicherry-weekend', $slugs);
        $this->assertNotContains('kashmir-delight', $slugs);

        $this->getJson('/api/v1/collections/nope')->assertNotFound();
    }

    public function test_tour_list_supports_tag_filter_and_draft_tours_are_excluded(): void
    {
        Tour::where('slug', 'pondicherry-weekend')->update(['status' => 'draft']);

        $slugs = collect($this->getJson('/api/v1/tours?tag=weekend')->json('data'))->pluck('slug');

        $this->assertContains('coorg-weekend', $slugs);
        $this->assertNotContains('pondicherry-weekend', $slugs);
    }

    public function test_admin_can_tag_tours_only_with_known_tags(): void
    {
        $this->staff('operations');
        $tour = Tour::where('slug', 'kashmir-delight')->firstOrFail();

        $this->putJson("/api/v1/admin/tours/{$tour->id}", ['tags' => ['family', 'couples']])->assertOk();
        $this->assertSame(['family', 'couples'], $tour->fresh()->tags);
        $this->putJson("/api/v1/admin/tours/{$tour->id}", ['tags' => ['made-up']])->assertUnprocessable();
    }

    // Case studies and careers

    public function test_only_published_case_studies_are_public(): void
    {
        CaseStudy::create(['client_name' => 'Hidden Co', 'destination' => 'X', 'headcount' => 10, 'blurb' => 'b', 'published' => false]);

        $names = collect($this->getJson('/api/v1/case-studies')->assertOk()->json('data'))->pluck('client_name');

        $this->assertNotContains('Hidden Co', $names);
        $this->assertCount(3, $names);
    }

    public function test_corporate_staff_manage_case_studies_and_only_admin_deletes(): void
    {
        $this->staff('corporate');
        $id = $this->postJson('/api/v1/admin/case-studies', ['client_name' => 'Acme', 'destination' => 'Goa', 'headcount' => 25, 'blurb' => 'Team trip', 'published' => true])->assertCreated()->json('data.id');
        $this->putJson("/api/v1/admin/case-studies/{$id}", ['headcount' => 30])->assertOk();
        $this->deleteJson("/api/v1/admin/case-studies/{$id}")->assertForbidden();

        $this->staff('corporate', 'admin');
        $this->deleteJson("/api/v1/admin/case-studies/{$id}")->assertOk();
    }

    public function test_open_positions_are_listed_and_closed_ones_are_not(): void
    {
        JobOpening::create(['title' => 'Closed role', 'description' => 'd', 'status' => 'closed']);

        $titles = collect($this->getJson('/api/v1/careers/openings')->assertOk()->json('data'))->pluck('title');

        $this->assertContains('Trip Captain', $titles);
        $this->assertNotContains('Closed role', $titles);
    }

    private function application(array $extra = []): array
    {
        return array_merge(['name' => 'Ravi Kumar', 'email' => 'ravi@example.com', 'phone' => '9876543210', 'experience' => 'Led treks for 3 years.'], $extra);
    }

    public function test_application_with_resume_is_stored_privately(): void
    {
        Storage::fake('local');

        $this->post('/api/v1/careers/apply', $this->application(['resume' => UploadedFile::fake()->create('cv.pdf', 200, 'application/pdf')]), ['Accept' => 'application/json'])
            ->assertCreated();

        $app = JobApplication::firstOrFail();
        $this->assertNotNull($app->resume_path);
        $this->assertSame('cv.pdf', $app->resume_name);
        Storage::disk('local')->assertExists($app->resume_path);
    }

    public function test_application_rejects_bad_files_and_missing_fields(): void
    {
        Storage::fake('local');
        $h = ['Accept' => 'application/json'];

        $this->post('/api/v1/careers/apply', $this->application(['resume' => UploadedFile::fake()->create('cv.exe', 10)]), $h)->assertUnprocessable()->assertJsonValidationErrors(['resume']);
        $this->post('/api/v1/careers/apply', $this->application(['resume' => UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf')]), $h)->assertUnprocessable();
        $this->post('/api/v1/careers/apply', ['name' => 'x'], $h)->assertUnprocessable()->assertJsonValidationErrors(['email', 'phone', 'experience']);
        $this->assertSame(0, JobApplication::count());
    }

    public function test_hr_reviews_applications_and_downloads_resumes(): void
    {
        Storage::fake('local');
        $this->post('/api/v1/careers/apply', $this->application(['resume' => UploadedFile::fake()->create('cv.pdf', 50, 'application/pdf')]), ['Accept' => 'application/json']);
        $app = JobApplication::firstOrFail();

        $this->staff('sales');
        $this->getJson('/api/v1/admin/careers/applications')->assertForbidden();
        $this->getJson("/api/v1/admin/careers/applications/{$app->id}/resume")->assertForbidden();

        $this->staff('hr');
        $this->getJson('/api/v1/admin/careers/applications')->assertOk()->assertJsonPath('data.0.has_resume', true);
        $this->putJson("/api/v1/admin/careers/applications/{$app->id}", ['status' => 'shortlisted', 'notes' => 'Call Monday'])->assertOk();
        $this->putJson("/api/v1/admin/careers/applications/{$app->id}", ['status' => 'bogus'])->assertUnprocessable();
        $this->get("/api/v1/admin/careers/applications/{$app->id}/resume", ['Accept' => 'application/json'])->assertOk()->assertDownload('cv.pdf');
        $this->assertDatabaseHas('audit_logs', ['action' => 'job_application.resume_downloaded']);
    }

    public function test_hr_staff_manage_openings_but_only_admin_deletes(): void
    {
        $this->staff('hr');
        $id = $this->postJson('/api/v1/admin/careers/openings', ['title' => 'Designer', 'description' => 'Design things'])->assertCreated()->json('data.id');
        $this->putJson("/api/v1/admin/careers/openings/{$id}", ['status' => 'closed'])->assertOk();
        $this->deleteJson("/api/v1/admin/careers/openings/{$id}")->assertForbidden();

        $this->staff('hr', 'admin');
        $this->deleteJson("/api/v1/admin/careers/openings/{$id}")->assertOk();
    }

    // Corporate and custom enquiries

    public function test_corporate_quote_needs_company_and_details_and_is_stored(): void
    {
        $this->postJson('/api/v1/leads/corporate', ['name' => 'HR Lead', 'phone' => '9876543210'])->assertUnprocessable()
            ->assertJsonValidationErrors(['company', 'email', 'details.team_size', 'details.event_type']);

        $this->postJson('/api/v1/leads/corporate', [
            'name' => 'HR Lead', 'phone' => '9876543210', 'email' => 'hr@acme.test', 'company' => 'Acme Ltd', 'destination' => 'Bali',
            'details' => ['team_size' => 60, 'event_type' => 'offsite', 'budget' => '20-30 lakh'],
        ])->assertCreated();

        $lead = Lead::firstOrFail();
        $this->assertSame('corporate', $lead->source);
        $this->assertSame('Acme Ltd', $lead->company);
        $this->assertSame(60, $lead->details['team_size']);
    }

    public function test_custom_trip_request_validates_traveller_type(): void
    {
        $this->postJson('/api/v1/leads/custom', ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@b.test', 'details' => ['traveller_type' => 'aliens']])
            ->assertUnprocessable()->assertJsonValidationErrors(['details.traveller_type']);

        $this->postJson('/api/v1/leads/custom', ['name' => 'A', 'phone' => '9876543210', 'email' => 'a@b.test', 'destination' => 'Japan', 'details' => ['traveller_type' => 'family', 'flexible_dates' => true, 'interests' => 'food, temples']])
            ->assertCreated();
        $this->assertSame('custom', Lead::firstOrFail()->source);
    }

    public function test_leads_are_visible_only_to_the_department_that_owns_them(): void
    {
        $this->postJson('/api/v1/leads/callback', ['name' => 'Cb', 'phone' => '9876543210']);
        $this->postJson('/api/v1/leads/corporate', ['name' => 'Co', 'phone' => '9876543210', 'email' => 'c@x.test', 'company' => 'X', 'details' => ['team_size' => 20, 'event_type' => 'offsite']]);
        $this->postJson('/api/v1/leads/custom', ['name' => 'Cu', 'phone' => '9876543210', 'email' => 'u@x.test', 'details' => ['traveller_type' => 'couple']]);
        $corp = Lead::where('source', 'corporate')->firstOrFail();
        $custom = Lead::where('source', 'custom')->firstOrFail();

        $this->staff('sales');
        $this->assertSame(['callback'], collect($this->getJson('/api/v1/admin/leads')->json('data'))->pluck('source')->all());
        $this->putJson("/api/v1/admin/leads/{$corp->id}", ['status' => 'contacted'])->assertNotFound();

        $this->staff('corporate');
        $this->assertSame(['corporate'], collect($this->getJson('/api/v1/admin/leads')->json('data'))->pluck('source')->all());
        $this->getJson('/api/v1/admin/leads')->assertJsonPath('data.0.company', 'X');
        $this->putJson("/api/v1/admin/leads/{$custom->id}", ['status' => 'contacted'])->assertNotFound();
        $this->putJson("/api/v1/admin/leads/{$corp->id}", ['status' => 'qualified'])->assertOk();

        $this->staff('personalised');
        $this->assertSame(['custom'], collect($this->getJson('/api/v1/admin/leads')->json('data'))->pluck('source')->all());

        $this->staff('sales', 'admin');
        $this->assertCount(3, $this->getJson('/api/v1/admin/leads')->json('data'));
    }

    public function test_destination_lookup_still_works_for_seeded_content(): void
    {
        $this->assertNotNull(Destination::where('slug', 'bali')->first());
        $this->assertGreaterThanOrEqual(6, Post::count());
    }
}
