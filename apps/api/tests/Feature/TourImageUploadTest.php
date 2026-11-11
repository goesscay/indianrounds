<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TourImageUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        Storage::fake('public');
    }

    private function staff(string $dept): void
    {
        $u = User::factory()->create(['department' => $dept, 'staff_tier' => 'staff', 'is_active' => true]);
        $u->assignRole("{$dept}.staff");
        Sanctum::actingAs($u, ['staff']);
    }

    public function test_package_staff_can_upload_a_photo_and_it_is_served(): void
    {
        $this->staff('operations');

        $url = $this->postJson('/api/v1/admin/tours/upload-image', ['image' => UploadedFile::fake()->image('goa.jpg', 1200, 800)])->assertCreated()->json('data.url');
        $this->assertStringContainsString('/api/v1/media/tours/', $url);
        $file = basename($url);
        Storage::disk('public')->assertExists("tours/{$file}");

        $this->get("/api/v1/media/tours/{$file}")->assertOk();
        $this->get('/api/v1/media/tours/missing.jpg')->assertNotFound();
    }

    public function test_the_limit_is_five_megabytes_and_only_photos_are_accepted(): void
    {
        $this->staff('operations');

        $this->postJson('/api/v1/admin/tours/upload-image', ['image' => UploadedFile::fake()->create('ok.jpg', 5120, 'image/jpeg')])->assertCreated();
        $this->postJson('/api/v1/admin/tours/upload-image', ['image' => UploadedFile::fake()->create('big.jpg', 5121, 'image/jpeg')])
            ->assertUnprocessable()->assertJsonPath('errors.image.0', 'The photo must be 5 MB or smaller.');
        $this->postJson('/api/v1/admin/tours/upload-image', ['image' => UploadedFile::fake()->create('x.php', 10, 'application/x-php')])->assertUnprocessable();
        $this->postJson('/api/v1/admin/tours/upload-image', [])->assertUnprocessable();
    }

    public function test_staff_without_package_permission_cannot_upload(): void
    {
        $this->staff('finance');

        $this->postJson('/api/v1/admin/tours/upload-image', ['image' => UploadedFile::fake()->image('a.jpg')])->assertForbidden();
    }
}
