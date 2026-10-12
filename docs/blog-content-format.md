# Blog article format

Articles live in `apps/api/database/data/blog/<slug>.md`. The file name (without `.md`) is the URL slug: `/blog/<slug>`.
Load them with `php artisan blog:seed-posts` (add `--dry-run` to validate only, `--only-new` to leave existing posts untouched).

```
---
title: Kerala Backwaters for First-Timers: A 5-Day Plan
type: places_to_visit
destination: kerala
excerpt: One or two sentences, under 200 characters, shown on cards.
cover: /photos/places/kerala/alleppey-houseboat.jpg
featured: no
age: 12
meta: SEO description, under 160 characters.
facts:
- Best time: October to March
- Ideal stay: 5 to 6 nights
- Getting there: Fly into Kochi
---
Body in Markdown.
```

| Field | Rules |
|---|---|
| `title` | Required, under 90 characters. |
| `type` | One of `places_to_visit`, `things_to_do`, `places_to_eat`, `places_to_shop`, `travel_journal`, `stories`, `news`, `general`. |
| `destination` | Optional destination slug (for example `kerala`, `united-arab-emirates`). It must exist. Leave out for general articles. |
| `excerpt` | Required, 60 to 200 characters. |
| `cover` | Required. A site photo path that exists under `apps/web/public`, for example `/photos/places/<destination>/<file>.jpg`. |
| `featured` | `yes` or `no`. Featured articles lead the blog landing page. |
| `age` | Days since publication (0 is today). Controls the order of articles. |
| `meta` | Optional SEO description, under 160 characters. |
| `facts` | Optional "Quick facts" box, 3 to 6 lines of `- Label: value`. Shown beside the article. |

## Body

Plain Markdown, 650 to 1,000 words. Supported: `##` and `###` headings, bullet lists, numbered lists, `**bold**`, `*italic*`, `[links](/path)` and tip boxes written as `> **Tip:** text`.
Do not use a top-level `#` heading (the title is shown separately), images, tables or HTML.

Internal links that exist: `/destinations/<slug>`, `/group-tours`, `/weekend-escapes`, `/honeymoon`, `/honeymoon/<slug>`, `/custom-trips`, `/explore-india`, `/explore-the-world`, `/offers`, and `/blog/<slug>` for other articles.
