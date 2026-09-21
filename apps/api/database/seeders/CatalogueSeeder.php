<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\Destination;
use App\Models\Testimonial;
use App\Models\Tour;
use Illuminate\Database\Seeder;

/**
 * Sample catalogue for local/staging use only. Text and prices are placeholders
 * written for development; replace via admin (Phase 4) before launch.
 */
class CatalogueSeeder extends Seeder
{
    public function run(): void
    {
        $destinations = collect([
            ['India', 'india', 'india', 'Heritage | Culture | Diverse Experiences', 18999, 'October to March', 1, true],
            ['Dubai', 'dubai', 'international', 'Modern | Luxury | Unforgettable', 42999, 'November to March', 2, true],
            ['Thailand', 'thailand', 'international', 'Beaches | Adventure | Nightlife', 39999, 'November to February', 3, true],
            ['Singapore', 'singapore', 'international', 'City Life | Family | Entertainment', 44999, 'February to April', 4, true],
            ['Maldives', 'maldives', 'international', 'Islands | Relaxation | Romance', 74999, 'November to April', 5, true],
            ['Europe', 'europe', 'international', 'Culture | Cities | Scenic Rail Journeys', 139999, 'April to October', 6, true],
            ['Bali', 'bali', 'international', 'Temples | Beaches | Wellness', 36999, 'April to October', 7, false],
        ])->mapWithKeys(function ($d) {
            $model = Destination::updateOrCreate(['slug' => $d[1]], [
                'name' => $d[0],
                'region' => $d[2],
                'tagline' => $d[3],
                'starting_price' => $d[4],
                'best_time' => $d[5],
                'sort' => $d[6],
                'featured' => $d[7],
                'seo_content' => [
                    'overview' => "{$d[0]} is one of our most requested destinations. Our curated tours handle stays, transfers, sightseeing and support so you can simply enjoy the trip.",
                    'best_time' => "The best time to visit {$d[0]} is {$d[5]}.",
                ],
            ]);

            return [$d[1] => $model];
        });

        $short = ['Accommodation on twin-sharing basis', 'Daily breakfast', 'Private airport / station transfers', 'Guided sightseeing as per itinerary', 'Toll, parking and driver charges', 'Tour manager support on trip'];
        $long = ['Accommodation on twin-sharing basis', 'Daily breakfast', 'Airport transfers and intercity transport', 'Guided sightseeing as per itinerary', 'Local city cards / entry tickets as listed', 'Tour manager support on trip'];
        $exclusions = ['5% GST as applicable', 'Flights and visa fees unless stated', 'Personal expenses, tips and laundry', 'Meals not mentioned in the itinerary', 'Travel insurance', 'Anything not listed under inclusions'];
        $carry = ['Valid photo ID / passport', 'Comfortable walking shoes', 'Weather-appropriate clothing', 'Personal medicines', 'Power bank and universal adapter'];

        $tours = [
            ['kashmir-delight', 'india', 'Kashmir Delight', 4, 24999, 28999, 'short', true, 'Srinagar', 'Srinagar',
                'Shikara rides on Dal Lake, the meadows of Gulmarg and the valleys of Pahalgam on a relaxed five-day circuit.',
                ['Dal Lake shikara ride', 'Gulmarg gondola', 'Pahalgam valley', 'Mughal gardens'],
                [['Arrive Srinagar', 'Meet our representative, transfer to your houseboat and enjoy a sunset shikara ride.'], ['Srinagar to Gulmarg', 'Drive to Gulmarg for meadows and the gondola ride.'], ['Gulmarg to Pahalgam', 'Scenic drive to Pahalgam with stops at saffron fields.'], ['Pahalgam sightseeing', 'Visit Betaab Valley and Aru Valley.'], ['Depart Srinagar', 'Breakfast and transfer to the airport.']],
                [['Standard hotels, twin sharing', 24999, 28999], ['Deluxe hotels, twin sharing', 29999, 34999]]],
            ['himachal-explorer', 'india', 'Himachal Explorer', 5, 18999, 22999, 'short', true, 'Delhi', 'Delhi',
                'Shimla, Manali and the Kullu valley by road, with time for snow points and riverside cafes.',
                ['Shimla Mall Road', 'Solang Valley', 'Atal Tunnel', 'Kullu river camps'],
                [['Delhi to Shimla', 'Overnight drive or morning departure to Shimla.'], ['Shimla local', 'Mall Road, Jakhu temple and Kufri.'], ['Shimla to Manali', 'Drive along the Beas river.'], ['Manali local', 'Hadimba temple, Old Manali and Solang Valley.'], ['Kullu and Atal Tunnel', 'Excursion to Sissu side of the tunnel.'], ['Return to Delhi', 'Drive back with lunch stop.']],
                [['Standard hotels, twin sharing', 18999, 22999]]],
            ['ladakh-circuit', 'india', 'Leh Ladakh Circuit', 6, 27999, 32999, 'short', false, 'Leh', 'Leh',
                'Khardung La, Nubra Valley and Pangong Lake with time to acclimatise on day one.',
                ['Khardung La', 'Nubra sand dunes', 'Pangong Lake', 'Leh monasteries'],
                [['Arrive Leh', 'Rest day for acclimatisation.'], ['Leh local', 'Shanti Stupa, Leh Palace and market.'], ['Leh to Nubra', 'Cross Khardung La to Nubra Valley.'], ['Nubra to Pangong', 'Drive via Shyok valley to Pangong Lake.'], ['Pangong to Leh', 'Sunrise at the lake and return via Chang La.'], ['Leh sightseeing', 'Hemis and Thiksey monasteries.'], ['Depart Leh', 'Transfer to the airport.']],
                [['Tempo Traveller', 27999, 32999], ['Motorbike, solo rider', 36999, 41999], ['Motorbike, pillion', 30999, 35999]]],
            ['bali-getaway', 'bali', 'Bali Getaway', 4, 36999, 41999, 'short', true, 'Denpasar', 'Denpasar',
                'Ubud temples and rice terraces, then beach days in Seminyak and Nusa Dua.',
                ['Ubud rice terraces', 'Tanah Lot sunset', 'Beach clubs', 'Nusa Penida option'],
                [['Arrive Bali', 'Transfer to your Ubud resort.'], ['Ubud day', 'Tegallalang terraces, monkey forest and art market.'], ['Ubud to Seminyak', 'Temple visit and free evening.'], ['Beach day', 'Optional water sports at Nusa Dua.'], ['Depart Bali', 'Breakfast and airport transfer.']],
                [['Twin sharing', 36999, 41999], ['Single room supplement', 8999, null]]],
            ['europe-highlights', 'europe', 'Europe Highlights', 8, 149999, 169999, 'long', true, 'Paris', 'Rome',
                'Paris, Switzerland, Venice and Rome in nine days by coach and rail.',
                ['Eiffel Tower', 'Swiss Alps', 'Venice canals', 'Colosseum'],
                [['Arrive Paris', 'Welcome and evening Seine cruise.'], ['Paris sightseeing', 'Eiffel Tower, Louvre exterior and Montmartre.'], ['Paris to Lucerne', 'Travel to Switzerland.'], ['Mt Titlis', 'Cable car to the glacier.'], ['Lucerne to Venice', 'Cross the Alps by coach.'], ['Venice', 'Gondola ride and glassworks visit.'], ['Venice to Florence', 'Walking tour of the old town.'], ['Florence to Rome', 'Travel to Rome and city drive.'], ['Depart Rome', 'Colosseum visit and transfer.']],
                [['Twin sharing', 149999, 169999], ['Single room supplement', 34999, null]]],
            ['dubai-dazzle', 'dubai', 'Dubai Dazzle', 4, 42999, 47999, 'short', false, 'Dubai', 'Dubai',
                'Burj Khalifa, a desert safari and Abu Dhabi day trip.',
                ['Burj Khalifa', 'Desert safari', 'Dhow cruise', 'Abu Dhabi mosque'],
                [['Arrive Dubai', 'Hotel transfer and Marina dhow cruise.'], ['Dubai city', 'Old Dubai, Museum of the Future and Burj Khalifa.'], ['Desert safari', 'Dune bashing and BBQ dinner.'], ['Abu Dhabi', 'Grand Mosque and Corniche.'], ['Depart Dubai', 'Airport transfer.']],
                [['Twin sharing', 42999, 47999]]],
            ['thailand-beach-nightlife', 'thailand', 'Thailand Beaches & Nightlife', 5, 39999, 44999, 'short', false, 'Phuket', 'Bangkok',
                'Island hopping around Phuket followed by Bangkok markets and rooftops.',
                ['Phi Phi islands', 'Phuket old town', 'Bangkok street food', 'Chao Phraya cruise'],
                [['Arrive Phuket', 'Transfer and free evening.'], ['Phi Phi tour', 'Speedboat island hopping.'], ['Phuket free day', 'Beach time or optional activities.'], ['Fly to Bangkok', 'Temple visits and river cruise.'], ['Bangkok markets', 'Floating market and shopping.'], ['Depart Bangkok', 'Airport transfer.']],
                [['Twin sharing', 39999, 44999]]],
            ['singapore-city-break', 'singapore', 'Singapore City Break', 3, 44999, 49999, 'short', false, 'Singapore', 'Singapore',
                'Gardens by the Bay, Sentosa and Universal Studios in four easy days.',
                ['Gardens by the Bay', 'Sentosa', 'Universal Studios', 'Night Safari'],
                [['Arrive Singapore', 'City tour and Merlion Park.'], ['Sentosa day', 'Cable car and beaches.'], ['Universal Studios', 'Full-day entry.'], ['Depart Singapore', 'Airport transfer.']],
                [['Twin sharing', 44999, 49999]]],
            ['maldives-island-escape', 'maldives', 'Maldives Island Escape', 3, 74999, 82999, 'short', false, 'Malé', 'Malé',
                'Overwater stay with snorkelling, sunset cruise and spa time.',
                ['Overwater villa', 'Snorkelling', 'Sunset cruise', 'Spa credit'],
                [['Arrive Malé', 'Speedboat to the resort.'], ['Island day', 'Snorkelling and lagoon activities.'], ['Sunset cruise', 'Dolphin spotting cruise.'], ['Depart', 'Transfer back to Malé.']],
                [['Beach villa', 74999, 82999], ['Overwater villa', 98999, 108999]]],
            ['rajasthan-royal-trail', 'india', 'Rajasthan Royal Trail', 6, 26999, 30999, 'short', false, 'Jaipur', 'Udaipur',
                'Palaces, forts and desert camps across Jaipur, Jodhpur, Jaisalmer and Udaipur.',
                ['Amber Fort', 'Jaisalmer dunes', 'Udaipur lake palace views', 'Heritage havelis'],
                [['Arrive Jaipur', 'Old city walk.'], ['Jaipur sights', 'Amber Fort and City Palace.'], ['Jaipur to Jodhpur', 'Mehrangarh Fort.'], ['Jodhpur to Jaisalmer', 'Sunset at the dunes.'], ['Jaisalmer', 'Fort and havelis.'], ['Jaisalmer to Udaipur', 'Lake Pichola boat ride.'], ['Depart Udaipur', 'Transfer.']],
                [['Heritage hotels, twin sharing', 26999, 30999]]],
            ['kerala-backwaters', 'india', 'Kerala Backwaters', 5, 22999, 26999, 'short', false, 'Kochi', 'Kochi',
                'Munnar tea hills, Thekkady wildlife and a night on an Alleppey houseboat.',
                ['Munnar tea gardens', 'Periyar boat ride', 'Alleppey houseboat', 'Kathakali show'],
                [['Arrive Kochi', 'Drive to Munnar.'], ['Munnar', 'Tea museum and viewpoints.'], ['Munnar to Thekkady', 'Spice plantation walk.'], ['Thekkady to Alleppey', 'Board the houseboat.'], ['Alleppey to Kochi', 'Cultural show in the evening.'], ['Depart Kochi', 'Transfer.']],
                [['Standard, twin sharing', 22999, 26999]]],
            ['paris-swiss-alps', 'europe', 'Paris & Swiss Alps', 7, 139999, 154999, 'long', false, 'Paris', 'Zurich',
                'A shorter Europe trip pairing Paris with Lucerne, Interlaken and Zurich.',
                ['Paris', 'Interlaken', 'Jungfraujoch option', 'Lake Lucerne cruise'],
                [['Arrive Paris', 'Seine cruise.'], ['Paris day', 'Eiffel Tower and Montmartre.'], ['Paris to Interlaken', 'Rail via Basel.'], ['Interlaken', 'Free day for optional Jungfraujoch.'], ['Lucerne', 'Chapel Bridge and lake cruise.'], ['Zurich', 'Old town walk.'], ['Free morning', 'Shopping and rest.'], ['Depart Zurich', 'Airport transfer.']],
                [['Twin sharing', 139999, 154999], ['Single room supplement', 29999, null]]],
        ];

        foreach ($tours as $i => $t) {
            [$slug, $dest, $title, $nights, $price, $orig, $haul, $featured, $pickup, $drop, $summary, $highlights, $days, $variants] = $t;

            $itinerary = collect($days)->map(fn ($d, $n) => ['day' => $n + 1, 'title' => $d[0], 'description' => $d[1]])->all();

            $tour = Tour::updateOrCreate(['slug' => $slug], [
                'destination_id' => $destinations[$dest]->id,
                'title' => $title,
                'summary' => $summary,
                'tour_type' => 'group',
                'haul_class' => $haul,
                'duration_nights' => $nights,
                'pickup' => $pickup,
                'drop_point' => $drop,
                'overview' => $summary.' Every departure is led by a Tour Manager and includes the stays, transfers and sightseeing listed below.',
                'highlights' => $highlights,
                'itinerary' => $itinerary,
                'inclusions' => $haul === 'long' ? $long : $short,
                'exclusions' => $exclusions,
                'notes' => ['Itineraries can change for weather, road or safety reasons.', 'Prices are per person; GST is extra.'],
                'must_carry' => $carry,
                'base_price' => $price,
                'original_price' => $orig,
                'featured' => $featured,
                'status' => 'published',
            ]);

            $tour->variants()->delete();
            foreach ($variants as $v) {
                $tour->variants()->create(['label' => $v[0], 'price' => $v[1], 'original_price' => $v[2]]);
            }

            $tour->batches()->delete();
            for ($b = 0; $b < 6; $b++) {
                $start = now()->addDays(14 + $b * 21 + ($i % 5))->startOfDay();
                $capacity = 16;
                $booked = ($b === 1 || ($i + $b) % 7 === 0) ? $capacity : (($i * 3 + $b * 5) % 12);
                Batch::create([
                    'tour_id' => $tour->id,
                    'starts_on' => $start,
                    'ends_on' => $start->copy()->addDays($nights),
                    'capacity' => $capacity,
                    'seats_booked' => $booked,
                    'status' => $booked >= $capacity ? 'sold_out' : 'open',
                ]);
            }
        }

        foreach ([
            ['Priya Menon', 'Kochi', 'Our trip was perfectly planned. Everything was smooth and hassle-free.'],
            ['Ramesh Kumar', 'Chennai', 'Excellent service and great support throughout the trip. Highly recommended.'],
            ['Anita Sharma', 'Bengaluru', 'Professional team, good value and a memorable experience. Will travel again.'],
        ] as $n => $t) {
            Testimonial::updateOrCreate(['name' => $t[0]], [
                'location' => $t[1], 'quote' => $t[2], 'rating' => 5, 'sort' => $n, 'featured' => true,
            ]);
        }
    }
}
