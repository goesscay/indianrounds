<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SeedDestinationContentTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_shipped_profiles_are_complete_for_every_destination(): void
    {
        $profiles = json_decode((string) file_get_contents(database_path('data/destination_profiles.json')), true);
        $this->assertCount(12, $profiles);
        foreach ($profiles as $slug => $p) {
            $this->assertNotEmpty($p['overview'], $slug);
            foreach (['capital', 'currency', 'languages', 'time_zone', 'calling_code', 'driving_side', 'climate', 'flight_time'] as $f) {
                $this->assertNotEmpty($p['facts'][$f] ?? null, "{$slug} fact {$f}");
            }
            foreach (['reasons' => 4, 'attractions' => 6, 'experiences' => 5, 'food' => 4, 'tips' => 5] as $list => $min) {
                $this->assertGreaterThanOrEqual($min, count($p[$list]), "{$slug} {$list}");
                foreach ($p[$list] as $item) {
                    $this->assertNotEmpty($item['title']);
                    $this->assertNotEmpty($item['text']);
                }
            }
            foreach (['visa', 'health', 'money'] as $k) {
                $this->assertNotEmpty($p['travel_info'][$k] ?? null, "{$slug} {$k}");
            }
            $this->assertGreaterThanOrEqual(4, count($p['faqs']), $slug);
        }
    }

    public function test_it_fills_empty_parts_and_keeps_seasons_and_admin_edits(): void
    {
        Destination::create(['name' => 'Thailand', 'slug' => 'thailand', 'region' => 'international', 'seo_content' => [
            'overview' => 'Edited in the admin.',
            'seasons' => ['on' => ['months' => 'Nov–Feb', 'places' => 'Phuket', 'activities' => 'beaches']],
        ]]);

        $this->artisan('catalogue:seed-destination-content')->assertSuccessful();

        $seo = Destination::query()->where('slug', 'thailand')->firstOrFail()->seo_content;
        $this->assertSame('Edited in the admin.', $seo['overview']);
        $this->assertSame('Nov–Feb', $seo['seasons']['on']['months']);
        $this->assertSame('Bangkok', $seo['facts']['capital']);
        $this->assertNotEmpty($seo['faqs']);
    }

    public function test_force_replaces_existing_text_and_dry_run_changes_nothing(): void
    {
        Destination::create(['name' => 'Thailand', 'slug' => 'thailand', 'region' => 'international', 'seo_content' => ['overview' => 'Old.']]);

        $this->artisan('catalogue:seed-destination-content', ['--dry-run' => true, '--force' => true])->assertSuccessful();
        $this->assertSame('Old.', Destination::query()->firstOrFail()->seo_content['overview']);

        $this->artisan('catalogue:seed-destination-content', ['--force' => true])->assertSuccessful();
        $this->assertStringContainsString('Thailand', Destination::query()->firstOrFail()->seo_content['overview']);
    }

    public function test_an_unknown_destination_in_the_file_is_skipped(): void
    {
        $this->artisan('catalogue:seed-destination-content')->expectsOutputToContain('No destination with the slug')->assertSuccessful();
    }

    public function test_the_admin_saves_the_profile_lists_and_keeps_what_it_does_not_send(): void
    {
        $d = Destination::create(['name' => 'Thailand', 'slug' => 'thailand', 'region' => 'international', 'seo_content' => ['seasons' => ['on' => ['months' => 'Nov–Feb', 'places' => '', 'activities' => '']], 'faqs' => [['q' => 'Q?', 'a' => 'A.']]]]);
        $this->seed(RbacSeeder::class);
        $admin = User::factory()->create(['department' => null, 'staff_tier' => 'admin', 'is_active' => true]);
        $admin->assignRole('super_admin');
        Sanctum::actingAs($admin, ['staff']);

        $this->putJson("/api/v1/admin/destinations/{$d->id}", ['seo_content' => [
            'facts' => ['capital' => 'Bangkok', 'currency' => null],
            'attractions' => [['title' => 'Grand Palace', 'text' => 'Royal complex']],
            'tips' => [],
        ]])->assertOk();

        $seo = $d->fresh()->seo_content;
        $this->assertSame(['capital' => 'Bangkok'], $seo['facts']);
        $this->assertSame('Grand Palace', $seo['attractions'][0]['title']);
        $this->assertSame('Nov–Feb', $seo['seasons']['on']['months']);
        $this->assertSame('Q?', $seo['faqs'][0]['q'], 'FAQs were not sent, so they stay');
        $this->assertArrayNotHasKey('tips', $seo);

        $this->putJson("/api/v1/admin/destinations/{$d->id}", ['seo_content' => ['attractions' => [['text' => 'no title']]]])->assertStatus(422);
    }
}
