<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\Post;
use App\Services\BlogContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlogContentTest extends TestCase
{
    use RefreshDatabase;

    private function article(array $override = [], string $body = ''): string
    {
        $fm = array_merge([
            'title' => 'Kerala in Five Days: Backwaters, Hills and Beaches',
            'type' => 'places_to_visit',
            'destination' => 'kerala',
            'excerpt' => 'A realistic five-day Kerala plan that mixes tea hills, a houseboat night and a beach finish.',
            'cover' => '/photos/places/kerala/alleppey-houseboat.jpg',
            'featured' => 'yes',
            'age' => '10',
            'meta' => 'A five-day Kerala plan.',
        ], $override);
        $lines = [];
        foreach ($fm as $k => $v) {
            if ($v !== null) {
                $lines[] = "{$k}: {$v}";
            }
        }
        $lines[] = 'facts:';
        $lines[] = '- Best time: October to March';
        $lines[] = '- Ideal stay: 5 to 7 nights';

        return "---\n".implode("\n", $lines)."\n---\n".($body !== '' ? $body : str_repeat('Kerala is long and narrow, so keep the driving days short. ', 60));
    }

    /** @return array{data: array<string, mixed>, errors: list<string>} */
    private function parse(string $text, string $slug = 'kerala-in-five-days'): array
    {
        return (new BlogContent)->parse($slug, $text);
    }

    public function test_an_article_file_is_read_into_its_parts(): void
    {
        $r = $this->parse($this->article());

        $this->assertSame([], $r['errors']);
        $this->assertSame('places_to_visit', $r['data']['type']);
        $this->assertSame('kerala', $r['data']['destination']);
        $this->assertTrue($r['data']['featured']);
        $this->assertSame(10, $r['data']['age']);
        $this->assertSame([['label' => 'Best time', 'value' => 'October to March'], ['label' => 'Ideal stay', 'value' => '5 to 7 nights']], $r['data']['facts']);
        $this->assertStringStartsWith('Kerala is long', $r['data']['body']);
    }

    public function test_a_file_without_front_matter_or_with_unknown_keys_is_rejected(): void
    {
        $this->assertNotSame([], $this->parse("Just text\n")['errors']);
        $this->assertContains('unknown front matter key: colour', $this->parse($this->article(['colour' => 'red']))['errors']);
    }

    public function test_validation_catches_bad_content(): void
    {
        Destination::query()->create(['slug' => 'kerala', 'name' => 'Kerala', 'region' => 'india']);
        $blog = new BlogContent;
        $ok = fn (array $o = [], string $body = '') => $blog->validate($this->parse($this->article($o, $body))['data']);

        $this->assertSame([], $ok());
        $this->assertNotSame([], $ok(['type' => 'nonsense']));
        $this->assertNotSame([], $ok(['destination' => 'atlantis']));
        $this->assertNotSame([], $ok(['cover' => '/photos/places/kerala/not-a-photo.jpg']));
        $this->assertNotSame([], $ok(['excerpt' => 'Too short.']));
        $this->assertNotSame([], $ok([], 'Far too short to publish.'));
        $this->assertNotSame([], $ok([], "# A top level heading\n\n".str_repeat('word ', 450)));
        $this->assertNotSame([], $ok([], str_repeat('word ', 450)."\n\n<script>alert(1)</script>"));
        $this->assertNotSame([], $ok([], str_repeat('word ', 450)."\n\n![Gone](/photos/places/kerala/missing.jpg)"));
        $this->assertSame([], $ok([], str_repeat('word ', 450)."\n\n![Houseboat](/photos/places/kerala/alleppey-houseboat.jpg)"));
        $this->assertContains('the link /destinations/atlantis points to a destination that does not exist', $ok([], str_repeat('word ', 450)."\n\n[Go](/destinations/atlantis)"));
    }

    public function test_applying_creates_then_updates_without_moving_the_date_and_only_new_skips(): void
    {
        $kerala = Destination::query()->create(['slug' => 'kerala', 'name' => 'Kerala', 'region' => 'india']);
        $blog = new BlogContent;
        $data = $this->parse($this->article())['data'];

        $this->assertSame('created', $blog->apply($data));
        $post = Post::query()->where('slug', 'kerala-in-five-days')->firstOrFail();
        $this->assertSame('published', $post->status);
        $this->assertTrue($post->is_featured);
        $this->assertSame($kerala->id, $post->destination_id);
        $this->assertSame('/photos/places/kerala/alleppey-houseboat.jpg', $post->cover_image_url);
        $this->assertSame('Best time', $post->key_facts[0]['label']);
        $this->assertGreaterThanOrEqual(1, $post->read_minutes);
        $this->assertEqualsWithDelta(now()->subDays(10)->timestamp, $post->published_at->timestamp, 86400);
        $firstDate = $post->published_at->toIso8601String();

        $data['title'] = 'Kerala in Five Days (updated)';
        $data['age'] = 40;
        $this->assertSame('updated', $blog->apply($data));
        $post->refresh();
        $this->assertSame('Kerala in Five Days (updated)', $post->title);
        $this->assertSame($firstDate, $post->published_at->toIso8601String());

        $data['title'] = 'Changed again';
        $this->assertSame('skipped', $blog->apply($data, true));
        $this->assertSame('Kerala in Five Days (updated)', $post->fresh()->title);
        $this->assertSame(1, Post::query()->count());
    }

    public function test_the_shipped_articles_are_all_valid(): void
    {
        $slugs = BlogContent::slugs();
        $this->assertGreaterThanOrEqual(40, count($slugs));

        foreach (glob(database_path('data/catalogue/*.json')) ?: [] as $file) {
            $slug = basename($file, '.json');
            Destination::query()->firstOrCreate(['slug' => $slug], ['name' => ucfirst($slug), 'region' => 'international']);
        }

        $blog = new BlogContent;
        $covers = [];
        $problems = [];
        foreach ($slugs as $slug) {
            $r = $blog->parse($slug, (string) file_get_contents(BlogContent::dir()."/{$slug}.md"));
            foreach ([...$r['errors'], ...$blog->validate($r['data'], $slugs)] as $e) {
                $problems[] = "{$slug}: {$e}";
            }
            $covers[] = $r['data']['cover'];
        }

        $this->assertSame([], $problems);
        $this->assertSame(count($covers), count(array_unique($covers)), 'every article should have its own cover photo');
    }

    public function test_the_command_validates_and_saves(): void
    {
        foreach (glob(database_path('data/catalogue/*.json')) ?: [] as $file) {
            $slug = basename($file, '.json');
            Destination::query()->firstOrCreate(['slug' => $slug], ['name' => ucfirst($slug), 'region' => 'international']);
        }

        $this->artisan('blog:seed-posts', ['--dry-run' => true])->assertSuccessful();
        $this->assertSame(0, Post::query()->count());

        $this->artisan('blog:seed-posts')->assertSuccessful();
        $this->assertSame(count(BlogContent::slugs()), Post::query()->count());
        $this->assertGreaterThan(0, Post::query()->where('is_featured', true)->count());

        $this->artisan('blog:seed-posts', ['--only-new' => true])->expectsOutputToContain('0 created')->assertSuccessful();
    }

    public function test_the_blog_api_reports_counts_featured_and_key_facts(): void
    {
        $kerala = Destination::query()->create(['slug' => 'kerala', 'name' => 'Kerala', 'region' => 'india']);
        $goa = Destination::query()->create(['slug' => 'goa', 'name' => 'Goa', 'region' => 'india']);
        $blog = new BlogContent;
        $blog->apply($this->parse($this->article(), 'kerala-five-days')['data']);
        $blog->apply($this->parse($this->article(['title' => 'Kerala food', 'type' => 'places_to_eat', 'featured' => 'no']), 'kerala-food')['data']);
        $blog->apply($this->parse($this->article(['title' => 'Goa guide', 'destination' => 'goa', 'cover' => '/photos/places/goa/anjuna-beach.jpg', 'featured' => 'no']), 'goa-guide')['data']);

        $res = $this->getJson('/api/v1/posts')->assertOk();
        $res->assertJsonPath('meta.total', 3);
        $res->assertJsonPath('meta.types.places_to_visit', 2);
        $res->assertJsonPath('meta.types.places_to_eat', 1);
        $this->assertSame(['kerala' => 2, 'goa' => 1], collect($res->json('meta.destinations'))->pluck('count', 'slug')->all());

        $featured = $this->getJson('/api/v1/posts?featured=1')->assertOk();
        $this->assertSame(['kerala-five-days'], collect($featured->json('data'))->pluck('slug')->all());
        // the counts do not change with the filter
        $featured->assertJsonPath('meta.types.places_to_eat', 1);

        $this->getJson('/api/v1/posts?destination=goa')->assertJsonPath('meta.total', 1);

        $show = $this->getJson('/api/v1/posts/kerala-five-days')->assertOk();
        $show->assertJsonPath('data.key_facts.0.label', 'Best time');
        $show->assertJsonPath('data.is_featured', true);
        // related: the same destination first
        $this->assertSame('kerala-food', $show->json('data.related.0.slug'));
        $this->assertNotNull($kerala->id);
        $this->assertNotNull($goa->id);
    }
}
