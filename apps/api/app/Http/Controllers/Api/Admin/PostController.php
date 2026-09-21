<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\Paginates;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PostController extends Controller
{
    use Paginates;

    public function index(Request $request): JsonResponse
    {
        $q = Post::query()->with('destination:id,name')->latest('id');
        if ($request->filled('status')) {
            $q->where('status', $request->string('status'));
        }
        if ($request->filled('q')) {
            $q->where('title', 'like', '%'.str_replace(['%', '_'], ['\\%', '\\_'], (string) $request->string('q')).'%');
        }

        return $this->page($q->paginate(20), fn (Post $p) => [
            'id' => $p->id, 'title' => $p->title, 'slug' => $p->slug, 'status' => $p->status, 'content_type' => $p->content_type,
            'destination' => $p->destination?->name, 'author_name' => $p->author_name, 'read_minutes' => $p->read_minutes,
            'published_at' => $p->published_at?->toIso8601String(),
        ]);
    }

    public function show(Post $post): JsonResponse
    {
        return response()->json(['data' => $post]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $this->guardPublish($request, $data['status'] ?? 'draft', null);
        $data['slug'] = $data['slug'] ?? $this->uniqueSlug($data['title']);
        $data['status'] ??= 'draft';
        $data['author_name'] ??= $request->user()->name;
        $request->merge(['slug' => $data['slug']]);
        $request->validate(['slug' => 'unique:posts,slug']);

        $post = Post::create($data);
        AuditLog::record('post.created', $post, null, ['title' => $post->title, 'status' => $post->status]);

        return response()->json(['data' => $post], 201);
    }

    public function update(Request $request, Post $post): JsonResponse
    {
        $data = $this->validated($request, $post);
        if (array_key_exists('status', $data)) {
            $this->guardPublish($request, $data['status'], $post);
        }

        $before = $post->only(array_diff(array_keys($data), ['body']));
        $post->update($data);
        AuditLog::record('post.updated', $post, $before, $post->only(array_diff(array_keys($data), ['body'])));

        return response()->json(['data' => $post->fresh()]);
    }

    public function destroy(Post $post): JsonResponse
    {
        AuditLog::record('post.deleted', $post, ['title' => $post->title, 'slug' => $post->slug]);
        $post->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    private function guardPublish(Request $request, string $newStatus, ?Post $post): void
    {
        $changing = $post === null ? $newStatus === 'published' : $post->status !== $newStatus;
        if ($changing && ! $request->user()->hasPermissionTo('posts.publish')) {
            throw ValidationException::withMessages(['status' => 'Only an Admin can publish or unpublish a post.']);
        }
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'post';
        $slug = $base;
        for ($i = 2; Post::query()->where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Post $existing = null): array
    {
        $req = $existing ? 'sometimes|required' : 'required';

        return $request->validate([
            'title' => "{$req}|string|max:200",
            'slug' => ['sometimes', 'string', 'max:220', 'regex:/^[a-z0-9-]+$/', Rule::unique('posts', 'slug')->ignore($existing?->id)],
            'excerpt' => 'nullable|string|max:500',
            'body' => "{$req}|string|max:100000",
            'content_type' => ['sometimes', Rule::in(Post::TYPES)],
            'destination_id' => 'nullable|integer|exists:destinations,id',
            'author_name' => 'sometimes|string|max:120',
            'cover_image_url' => 'nullable|url|max:500',
            'meta_description' => 'nullable|string|max:300',
            'status' => 'sometimes|in:draft,published',
        ]);
    }
}
