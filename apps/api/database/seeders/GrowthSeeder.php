<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\CaseStudy;
use App\Models\Destination;
use App\Models\JobOpening;
use App\Models\Post;
use App\Models\Tour;
use Illuminate\Database\Seeder;

/**
 * Sample growth content for local/staging use only (placeholder text and fictional clients).
 * Replace through the admin before launch.
 */
class GrowthSeeder extends Seeder
{
    public function run(): void
    {
        if (Destination::query()->doesntExist()) {
            $this->call(CatalogueSeeder::class);
        }

        $this->tourTags();
        $this->extraTours();
        $this->posts();
        $this->caseStudies();
        $this->openings();
    }

    private function tourTags(): void
    {
        $map = [
            'maldives-island-escape' => ['luxury', 'couples'],
            'bali-getaway' => ['couples'],
            'dubai-dazzle' => ['luxury', 'family'],
            'singapore-city-break' => ['family'],
            'kerala-backwaters' => ['couples', 'family'],
            'himachal-explorer' => ['family'],
            'europe-highlights' => ['luxury'],
        ];
        foreach ($map as $slug => $tags) {
            Tour::query()->where('slug', $slug)->update(['tags' => json_encode($tags)]);
        }
    }

    private function extraTours(): void
    {
        $india = Destination::query()->where('slug', 'india')->firstOrFail();
        $inc = ['Accommodation on twin-sharing basis', 'Daily breakfast', 'Transfers and sightseeing as per itinerary', 'Tour manager support on trip'];
        $exc = ['5% GST as applicable', 'Personal expenses and tips', 'Meals not mentioned in the itinerary', 'Travel insurance'];
        $carry = ['Valid photo ID', 'Comfortable walking shoes', 'Personal medicines'];

        $xmas = now()->month === 12 && now()->day > 22 ? now()->addYear() : now();
        $xmasStart = $xmas->copy()->setDate($xmas->year, 12, 22)->startOfDay();

        $tours = [
            ['pondicherry-weekend', 'Pondicherry Weekend', 1, 6999, 7999, ['weekend'], 'Friday-night departure to French-quarter cafes, beaches and Auroville, back by Sunday night.',
                [['Friday night', 'Overnight drive from Chennai.'], ['Saturday', 'French Quarter walk, promenade and beach sunset.'], ['Sunday', 'Auroville and Matrimandir, then return.']], 'weekly'],
            ['coorg-weekend', 'Coorg Coffee Weekend', 2, 9499, 10999, ['weekend', 'family'], 'Coffee estates, waterfalls and misty viewpoints in three easy days.',
                [['Day 1', 'Depart and reach Coorg for a plantation walk.'], ['Day 2', 'Abbey Falls, Raja Seat and Namdroling Monastery.'], ['Day 3', 'Sunrise viewpoint and return.']], 'weekly'],
            ['pushkar-fair-escape', 'Pushkar Fair Escape', 3, 17999, 19999, ['festival'], 'Camel fair, desert camps and ghats in Rajasthan during fair week.',
                [['Arrive Jaipur', 'Transfer to Pushkar.'], ['Fair day', 'Camel fair, cultural evening.'], ['Ghats and temples', 'Morning aarti and market.'], ['Return', 'Drive back to Jaipur.']], 'fair'],
            ['kerala-christmas-new-year', 'Kerala Christmas & New Year', 4, 28999, 32999, ['seasonal-christmas', 'family'], 'Backwaters, hill stations and a New Year evening on a houseboat.',
                [['Arrive Kochi', 'Drive to Munnar.'], ['Munnar', 'Tea gardens and viewpoints.'], ['Thekkady', 'Spice walk and boat ride.'], ['Alleppey', 'Houseboat cruise, New Year dinner.'], ['Depart', 'Transfer to Kochi.']], 'xmas'],
        ];

        foreach ($tours as $i => [$slug, $title, $nights, $price, $orig, $tags, $summary, $days, $pattern]) {
            $tour = Tour::query()->updateOrCreate(['slug' => $slug], [
                'destination_id' => $india->id,
                'title' => $title,
                'summary' => $summary,
                'tour_type' => 'group',
                'haul_class' => 'short',
                'duration_nights' => $nights,
                'pickup' => 'Chennai',
                'drop_point' => 'Chennai',
                'overview' => $summary.' Every departure is led by a Tour Manager.',
                'highlights' => array_column($days, 0),
                'itinerary' => collect($days)->map(fn ($d, $n) => ['day' => $n + 1, 'title' => $d[0], 'description' => $d[1]])->all(),
                'inclusions' => $inc,
                'exclusions' => $exc,
                'notes' => ['Itineraries can change for weather, road or safety reasons.'],
                'must_carry' => $carry,
                'base_price' => $price,
                'original_price' => $orig,
                'tags' => $tags,
                'featured' => false,
                'status' => 'published',
            ]);

            $tour->batches()->delete();
            for ($b = 0; $b < 4; $b++) {
                $start = match ($pattern) {
                    'weekly' => now()->next('Friday')->addWeeks($b * 2)->addWeeks($i)->startOfDay(),
                    'fair' => now()->addDays(30 + $b * 20)->startOfDay(),
                    default => $xmasStart->copy()->addDays($b * 3),
                };
                Batch::query()->create([
                    'tour_id' => $tour->id, 'starts_on' => $start, 'ends_on' => $start->copy()->addDays($nights),
                    'capacity' => 16, 'seats_booked' => ($b * 5 + $i) % 12, 'status' => 'open',
                ]);
            }
        }
    }

    private function posts(): void
    {
        $dest = fn (string $slug) => Destination::query()->where('slug', $slug)->value('id');
        $posts = [
            ['best-time-to-visit-kashmir', 'Best Time to Visit Kashmir', 'places_to_visit', 'india', 'Every season shows a different Kashmir. Here is how to choose yours.',
                "## Spring and summer\n\nApril to June is mild and green, with tulips in bloom and meadows open in Gulmarg and Pahalgam.\n\n## Autumn\n\nOctober turns the chinar trees red. Days are clear and evenings are cool.\n\n## Winter\n\nDecember to February brings snow, skiing and a very quiet Dal Lake.\n\n### Quick guide\n\n- **Meadows and trekking:** May to September\n- **Snow and skiing:** December to February\n- **Photography:** October"],
            ['seven-things-to-do-in-bali', '7 Things to Do in Bali Beyond the Beach', 'things_to_do', 'bali', 'Temples, terraces and cooking classes for when you want more than sun.',
                "Bali rewards travellers who leave the beach for a day.\n\n1. **Sunrise at a rice terrace** in Tegallalang.\n2. **Tanah Lot** at sunset.\n3. **A Balinese cooking class** in Ubud.\n4. **Monkey Forest** — keep your snacks hidden.\n5. **Nusa Penida** for cliffs and manta rays.\n6. **A water temple blessing** at Tirta Empul.\n7. **A slow morning at a warung** with coffee and fruit."],
            ['where-to-eat-in-dubai', 'Where to Eat in Dubai on Any Budget', 'places_to_eat', 'dubai', 'From old-town shawarma to a dinner with a view of the fountains.',
                "## Old Dubai\n\nStart in Deira and Bur Dubai for affordable Emirati and Indian food, and karak chai at any corner café.\n\n## Downtown\n\nBook ahead for a table with a fountain view. Weekday lunches are far cheaper than dinner.\n\n## Tip\n\nMost restaurants in malls add a service charge — check the bill before tipping."],
            ['a-weekend-in-pondicherry', 'A Weekend in Pondicherry: Our Travel Journal', 'travel_journal', 'india', 'Two days, one scooter and far too many croissants.',
                "We left Chennai on Friday night and woke up to the sound of the sea.\n\nSaturday was slow: a walk through the French Quarter, lunch in a courtyard café, and sunset on the promenade. On Sunday we drove to Auroville and sat quietly by the Matrimandir.\n\n**What we would do again:** rent a scooter, book stays in the White Town, and leave early on Sunday to beat traffic."],
            ['packing-list-for-a-europe-trip', 'The Only Europe Packing List You Need', 'general', 'europe', 'Pack light, layer well and carry one adapter that works everywhere.',
                "## Clothes\n\n- Layers you can mix and match\n- One smart outfit\n- Comfortable walking shoes\n\n## Documents\n\n- Passport and visa copies\n- Travel insurance\n- Hotel and rail bookings\n\n## Small things that help\n\n- A universal adapter\n- A reusable water bottle\n- A light rain jacket"],
            ['why-we-run-small-group-departures', 'Why We Run Small-Group Departures', 'stories', null, 'Fewer people, better trips: how we keep groups friendly and flexible.',
                "Big groups move slowly. Small groups move well.\n\nWe cap most departures at sixteen travellers so the Tour Manager knows every name, dinner tables stay easy to book, and the group can change plan when the weather does.\n\nIt also makes it easier to meet people — solo travellers regularly tell us they came alone and left with friends."],
        ];

        foreach ($posts as $n => [$slug, $title, $type, $destSlug, $excerpt, $body]) {
            Post::query()->updateOrCreate(['slug' => $slug], [
                'title' => $title, 'excerpt' => $excerpt, 'body' => $body, 'content_type' => $type,
                'destination_id' => $destSlug ? $dest($destSlug) : null, 'author_name' => 'Indian Rounds Team',
                'status' => 'published', 'published_at' => now()->subDays(($n + 1) * 6),
            ]);
        }
    }

    private function caseStudies(): void
    {
        foreach ([
            ['A Chennai software company', 'Maldives', 60, 'A three-day leadership offsite with workshops in the morning and island time in the afternoon.', 'The team came back energised and the planning was effortless.', 'People & Culture Lead', 'Sample client'],
            ['A financial-services firm', 'Bali', 40, 'A dealer-recognition trip combining an awards evening with a private villa stay.', null, null, null],
            ['An automotive brand', 'Spiti Valley', 50, 'A ride-and-stay experience for a racing team with mechanical support and curated overnight camps.', null, null, null],
        ] as $n => [$client, $dest, $count, $blurb, $quote, $qName, $qTitle]) {
            CaseStudy::query()->updateOrCreate(['client_name' => $client, 'destination' => $dest], [
                'headcount' => $count, 'blurb' => $blurb, 'quote' => $quote, 'quote_name' => $qName, 'quote_title' => $qTitle, 'published' => true, 'sort' => $n,
            ]);
        }
    }

    private function openings(): void
    {
        foreach ([
            ['Trip Captain', 'Operations', 'Chennai / On tour', 'Contract', 'Lead group departures: keep travellers safe, informed and having fun. Strong communication and first-aid awareness expected.'],
            ['Travel Consultant', 'Sales', 'Chennai', 'Full-time', 'Advise customers on trips, prepare quotes and follow bookings through to departure.'],
        ] as $n => [$title, $dept, $loc, $type, $desc]) {
            JobOpening::query()->updateOrCreate(['title' => $title], [
                'department' => $dept, 'location' => $loc, 'employment_type' => $type, 'description' => $desc, 'status' => 'open', 'sort' => $n,
            ]);
        }
    }
}
