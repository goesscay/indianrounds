<?php

namespace App\Http\Controllers\Api\Admin\Concerns;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

trait Paginates
{
    /**
     * @template T
     *
     * @param  LengthAwarePaginator<int, T>  $page
     */
    protected function page(LengthAwarePaginator $page, callable $map): JsonResponse
    {
        return response()->json([
            'data' => collect($page->items())->map($map)->values(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }
}
