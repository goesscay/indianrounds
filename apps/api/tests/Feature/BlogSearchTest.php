<?php

namespace Tests\Feature;

use App\Models\Destination;
use App\Models\Post;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BlogSearchTest extends TestCase
{
    use RefreshDatabase;

    private function article(string $title, string $body = 'Some text', ?Destination $dest = null, string $excerpt = 'An intro'): Post
    {
        return Post::create([
            'title' => $title, 'slug' => str($title)->slug()->toString(), 'excerpt' => $excerpt, 'body' => $body,
            'author_name' => 'A', 'status' => 'published', 'published_at' => now()->subDay(), 'destination_id' => $dest?->id,
        ]);
    }

    /** @return list<string> */
    private function search(string $q): array
    {
        return collect($this->getJson('/api/v1/posts?q='.urlencode($q))->assertOk()->json('data'))->pluck('title')->all();
    }

    public function test_a_single_word_finds_articles_without_typing_the_whole_title(): void
    {
        $this->article('Kerala in Five Days: Backwaters, Hills and Beaches');

        $this->assertSame(['Kerala in Five Days: Backwaters, Hills and Beaches'], $this->search('backwaters'));
        $this->assertSame(['Kerala in Five Days: Backwaters, Hills and Beaches'], $this->search('KERALA'));
    }

    public function test_every_word_must_match_but_in_any_order_and_in_any_field(): void
    {
        $this->article('Kerala in Five Days', 'Stay on a houseboat in Alleppey');
        $this->article('Goa Beyond the Beach', 'Quiet houseboat-free villages');

        $this->assertSame(['Kerala in Five Days'], $this->search('houseboat kerala'));
        $this->assertSame(['Kerala in Five Days'], $this->search('alleppey  kerala'));
        $this->assertSame([], $this->search('kerala beach'));
    }

    public function test_a_destination_or_its_region_finds_its_articles(): void
    {
        $india = Destination::create(['name' => 'Kerala', 'slug' => 'kerala', 'region' => 'india']);
        $abroad = Destination::create(['name' => 'Dubai', 'slug' => 'dubai', 'region' => 'international']);
        $this->article('Five days of tea hills and water', 'No place names here', $india, 'Hills and rivers');
        $this->article('Desert and skyline', 'No place names here', $abroad, 'Sand and glass');

        $this->assertSame(['Five days of tea hills and water'], $this->search('India'));
        $this->assertSame(['Five days of tea hills and water'], $this->search('kerala'));
        $this->assertSame(['Desert and skyline'], $this->search('dubai'));
    }

    public function test_title_and_destination_matches_come_before_matches_in_the_text_only(): void
    {
        $this->article('A packing list', 'Many travellers fly from Goa');
        $this->article('Goa Beyond the Beach', 'Sun and sand');

        $this->assertSame(['Goa Beyond the Beach', 'A packing list'], $this->search('goa'));
    }

    public function test_odd_input_is_safe(): void
    {
        $this->article('Plain title');

        $this->assertSame([], $this->search('100%'));
        $this->assertSame([], $this->search("' OR 1=1 --"));
        $this->assertSame(['Plain title'], $this->search('   plain   '));
        $this->assertSame(['Plain title'], $this->search('plain _ %'));
        $this->getJson('/api/v1/posts?q='.urlencode(str_repeat('a ', 45)))->assertOk();
    }
}
