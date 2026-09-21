<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'destination' => 'nullable|string|max:100',
            'type' => 'nullable|in:'.implode(',', Post::TYPES),
            'q' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:1|max:24',
        ]);

        $q = Post::query()->live()->with('destination:id,name,slug')->orderByDesc('published_at');
        if (! empty($data['destination'])) {
            $q->whereHas('destination', fn ($d) => $d->where('slug', $data['destination']));
        }
        if (! empty($data['type'])) {
            $q->where('content_type', $data['type']);
        }
        if (! empty($data['q'])) {
            $term = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $data['q']).'%';
            $q->where(fn ($w) => $w->where('title', 'like', $term)->orWhere('excerpt', 'like', $term));
        }

        $page = $q->paginate($data['per_page'] ?? 12)->withQueryString();

        return response()->json([
            'data' => $page->getCollection()->map(fn (Post $p) => $this->card($p))->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $post = Post::query()->live()->with('destination:id,name,slug')->where('slug', $slug)->firstOrFail();

        $related = Post::query()->live()->with('destination:id,name,slug')
            ->whereKeyNot($post->id)
            ->where(fn ($w) => $w->where('destination_id', $post->destination_id)->orWhere('content_type', $post->content_type))
            ->orderByDesc('published_at')->limit(3)->get();

        return response()->json(['data' => $this->card($post) + [
            'body' => $post->body,
            'meta_description' => $post->meta_description,
            'related' => $related->map(fn (Post $p) => $this->card($p))->values(),
        ]]);
    }

    /** @return array<string, mixed> */
    private function card(Post $p): array
    {
        return [
            'id' => $p->id,
            'title' => $p->title,
            'slug' => $p->slug,
            'excerpt' => $p->excerpt,
            'content_type' => $p->content_type,
            'destination' => $p->destination ? ['name' => $p->destination->name, 'slug' => $p->destination->slug] : null,
            'author_name' => $p->author_name,
            'cover_image_url' => $p->cover_image_url,
            'read_minutes' => $p->read_minutes,
            'published_at' => $p->published_at?->toIso8601String(),
        ];
    }
}
