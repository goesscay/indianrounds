<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlogLayoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    private function content(string $tier = 'staff'): User
    {
        $u = User::factory()->create(['department' => 'content', 'staff_tier' => $tier, 'is_active' => true]);
        $u->assignRole("content.{$tier}");
        Sanctum::actingAs($u, ['staff']);

        return $u;
    }

    public function test_a_post_without_a_saved_layout_uses_the_defaults(): void
    {
        $post = Post::create(['title' => 'T', 'slug' => 't', 'body' => 'Hello world', 'author_name' => 'A', 'status' => 'published']);

        $layout = $this->getJson("/api/v1/posts/{$post->slug}")->assertOk()->json('data.layout');

        $this->assertSame('overlay', $layout['hero_style']);
        $this->assertSame('right', $layout['sidebar']);
        $this->assertTrue($layout['show_quick_facts']);
        $this->assertTrue($layout['show_share']);
        $this->assertSame('', $layout['cta_title']);
    }

    public function test_layout_is_saved_validated_and_applied(): void
    {
        $this->content();
        $id = $this->postJson('/api/v1/admin/posts', [
            'title' => 'Kerala', 'body' => 'Some text here',
            'layout' => ['hero_style' => 'banner', 'sidebar' => 'none', 'show_share' => false, 'cta_title' => 'Plan Kerala'],
        ])->assertCreated()->json('data.id');

        $this->assertSame('banner', Post::find($id)->resolvedLayout()['hero_style']);
        $this->assertFalse(Post::find($id)->resolvedLayout()['show_share']);
        $this->assertTrue(Post::find($id)->resolvedLayout()['show_toc']); // not sent => default
        $this->getJson("/api/v1/admin/posts/{$id}")->assertOk()->assertJsonPath('data.layout.sidebar', 'none');

        $this->putJson("/api/v1/admin/posts/{$id}", ['layout' => ['hero_style' => 'sideways']])->assertUnprocessable()->assertJsonValidationErrors(['layout.hero_style']);
        $this->putJson("/api/v1/admin/posts/{$id}", ['layout' => ['show_toc' => 'maybe']])->assertUnprocessable();
    }

    public function test_photos_can_be_uploaded_and_are_served_publicly(): void
    {
        Storage::fake('public');
        $this->content();

        $url = $this->postJson('/api/v1/admin/posts/upload-image', ['image' => UploadedFile::fake()->image('a.jpg', 800, 600)])->assertCreated()->json('data.url');
        $this->assertStringContainsString('/api/v1/media/blog/', $url);
        $file = basename($url);
        Storage::disk('public')->assertExists("blog/{$file}");

        $this->get("/api/v1/media/blog/{$file}")->assertOk();
        $this->get('/api/v1/media/blog/missing.jpg')->assertNotFound();
        $this->get('/api/v1/media/blog/..%2F..%2F.env')->assertNotFound();
    }

    public function test_only_images_are_accepted_and_the_upload_needs_post_permission(): void
    {
        Storage::fake('public');
        $this->content();
        $this->postJson('/api/v1/admin/posts/upload-image', ['image' => UploadedFile::fake()->create('x.php', 10, 'application/x-php')])->assertUnprocessable();
        $this->postJson('/api/v1/admin/posts/upload-image', ['image' => UploadedFile::fake()->create('big.jpg', 6000, 'image/jpeg')])->assertUnprocessable();

        $u = User::factory()->create(['department' => 'finance', 'staff_tier' => 'staff', 'is_active' => true]);
        $u->assignRole('finance.staff');
        Sanctum::actingAs($u, ['staff']);
        $this->postJson('/api/v1/admin/posts/upload-image', ['image' => UploadedFile::fake()->image('a.jpg')])->assertForbidden();
    }
}
