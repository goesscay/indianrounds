"""Fills the client template with realistic sample data (docs/client-data/IndianRounds_Package_Data_SAMPLE.xlsx).

Shows the client what a completed workbook looks like, and doubles as an importer fixture:
    php artisan catalogue:import docs/client-data/IndianRounds_Package_Data_SAMPLE.xlsx --dry-run
Run: python scripts/build_sample_data.py
"""
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill

ROOT = Path(__file__).resolve().parent.parent / "docs" / "client-data"
wb = load_workbook(ROOT / "IndianRounds_Package_Data_Template.xlsx")


def put(sheet, row, vals):
    ws = wb[sheet]
    for col, v in vals.items():
        c = ws.cell(row=row, column=col, value=v)
        c.font = Font(name="Arial", size=10)  # drop the grey-italic "example" look
        if c.fill.fgColor.rgb in ("00F3F4F6", "FFF3F4F6"):
            c.fill = PatternFill(fill_type=None)


LONG, SHORT = "International long-haul", "Domestic / short-haul"
IND, INTL = "India", "International"

# ------------------------------------------------------------------ Destinations
destinations = [
    (IND, "Kerala", "Backwaters | Hill Stations | Ayurveda", "October to March", "God's Own Country: slow houseboat days on the backwaters, misty tea estates in Munnar, spice forests in Thekkady and palm-fringed beaches.", "country-kerala.jpg", "Yes"),
    (IND, "Rajasthan", "Forts | Palaces | Desert Camps", "October to March", "The land of kings: pink-city bazaars, hilltop forts, lake palaces in Udaipur and camel rides across the golden dunes of Jaisalmer.", "country-rajasthan.jpg", "Yes"),
    (IND, "Kashmir", "Lakes | Valleys | Snow Peaks", "April to October", "Shikara rides on Dal Lake, the meadows of Gulmarg and the pine valleys of Pahalgam, set against the Pir Panjal range.", "country-kashmir.jpg", "Yes"),
    (IND, "Andaman", "Beaches | Scuba | Island Hopping", "November to May", "Powder-white beaches, glass-clear water and coral reefs at Havelock and Neil Island, with easy snorkelling and scuba for beginners.", "country-andaman.jpg", "No"),
    (INTL, "Thailand", "Beaches | Street Food | Nightlife", "November to March", "Island beaches in Phuket and Krabi, temples and markets in Bangkok, and some of Asia's friendliest hospitality, all within a four-hour flight.", "country-thailand.jpg", "Yes"),
    (INTL, "Bali", "Temples | Rice Terraces | Wellness", "April to October", "Volcano sunrises, jungle waterfalls, clifftop temples and beach clubs: Bali suits couples, families and friends alike.", "country-bali.jpg", "Yes"),
    (INTL, "Vietnam", "Heritage | Cuisine | Bay Cruises", "February to April", "From the lanterns of Hoi An and the limestone bays of Ha Long to the buzz of Ho Chi Minh City, Vietnam packs history and food into every day.", "country-vietnam.jpg", "No"),
    (INTL, "Dubai", "Skyscrapers | Desert Safari | Shopping", "November to March", "A city of superlatives: the Burj Khalifa, dune bashing at sunset, gold souks and world-class family attractions.", "country-dubai.jpg", "No"),
]
for i, (region, name, tag, best, about, img, home) in enumerate(destinations):
    put("Destinations", 5 + i, {1: region, 2: name, 3: tag, 4: best, 5: about, 6: img, 7: home, 8: i + 1})

# ------------------------------------------------------------------ Categories: (menu, country, name, description, image)
categories = [
    ("Destinations", "Kerala", "Backwaters & Houseboats", "Drift through Alleppey and Kumarakom on a private houseboat.", "cat-kerala-backwaters.jpg"),
    ("Destinations", "Kerala", "Hills & Tea Estates", "Cool mountain air, tea gardens and waterfalls in Munnar and Thekkady.", "cat-kerala-hills.jpg"),
    ("Destinations", "Rajasthan", "Royal Heritage", "Palaces, forts and old bazaars across Jaipur, Jodhpur and Udaipur.", "cat-rajasthan-heritage.jpg"),
    ("Destinations", "Kashmir", "Valleys & Lakes", "Shikaras, gondola rides and green meadows in the Kashmir Valley.", "cat-kashmir-valleys.jpg"),
    ("Destinations", "Andaman", "Beach & Diving", "Swim, snorkel and dive around Havelock and Neil Island.", "cat-andaman-beach.jpg"),
    ("Destinations", "Thailand", "Beach & Islands", "Phuket, Krabi and the Phi Phi islands.", "cat-thailand-beach.jpg"),
    ("Destinations", "Thailand", "City & Culture", "Bangkok temples, floating markets and Pattaya nightlife.", "cat-thailand-city.jpg"),
    ("Destinations", "Bali", "Culture & Nature", "Ubud temples, rice terraces, waterfalls and volcano sunrises.", "cat-bali-culture.jpg"),
    ("Destinations", "Vietnam", "Heritage & Cuisine", "Ancient towns, lantern-lit streets and the country's famous food.", "cat-vietnam-heritage.jpg"),
    ("Destinations", "Dubai", "City & Desert", "Skyline, desert safari and shopping in one easy trip.", "cat-dubai-city.jpg"),
    ("Group Tours", "Kerala", "Fixed Departures", "Guided small-group Kerala trips on set dates.", None),
    ("Group Tours", "Rajasthan", "Fixed Departures", "Guided small-group Rajasthan circuits on set dates.", None),
    ("Group Tours", "Kashmir", "Summer Departures", "Escape the heat with guided departures from May to July.", None),
    ("Group Tours", "Thailand", "Fixed Departures", "Guided Thailand holidays with a tour manager from India.", None),
    ("Group Tours", "Vietnam", "Fixed Departures", "Guided Vietnam heritage tours on set dates.", None),
    ("Weekend Escapes", "Kerala", "Backwater Weekend", "Friday-evening departures, back for Monday.", None),
    ("Weekend Escapes", "Kerala", "Weekend in the Hills", "Two nights in the cool of Munnar.", None),
    ("Weekend Escapes", "Rajasthan", "Lake City Weekend", "Romance and palaces in Udaipur.", None),
    ("Honeymoon", "Kerala", "Romantic Kerala", "Private houseboats and candle-lit dinners.", None),
    ("Honeymoon", "Andaman", "Romantic Islands", "Beach villas and sunset walks for two.", None),
    ("Honeymoon", "Thailand", "Romantic Escapes", "Private island tours and couple spa sessions.", None),
    ("Honeymoon", "Bali", "Romantic Escapes", "Cliff-top villas, private pool and beach dinners.", None),
]
for i, (menu, country, name, desc, img) in enumerate(categories):
    put("Categories", 5 + i, {1: menu, 2: country, 3: name, 4: desc, 5: img, 6: 1 + i % 4})

# ------------------------------------------------------------------ Packages
# code, title, country, flight, nights, pickup, drop, summary, overview, price, original,
# highlights, inclusions, exclusions, notes, must_carry, featured, family, luxury
packages = [
    ("KER-001", "Kerala Backwaters & Hills - 6 Nights", "Kerala", SHORT, 6, "Kochi airport", "Trivandrum airport",
     "Munnar tea gardens, Thekkady spice forests, a night on an Alleppey houseboat and Kovalam beach in one guided loop.",
     "Start in Kochi and climb to the tea estates of Munnar, spend a day among the spice plantations and elephants of Thekkady, then float through the backwaters on a private houseboat before ending with two easy days on Kovalam's crescent beach.",
     28999, 32999, "Tea estate walk in Munnar\nPeriyar lake boat ride\nPrivate Alleppey houseboat with meals\nKathakali show in Kochi",
     "6 nights in 3-star hotels and one houseboat\nDaily breakfast, houseboat meals\nAC vehicle for all transfers and sightseeing\nTour manager on group departures\nAll entry fees listed in the itinerary",
     "Flights or train tickets to Kochi\nLunches and dinners other than on the houseboat\nCamera fees and personal expenses\nTravel insurance",
     "Houseboat check-in is at noon\nItinerary may change for weather or road conditions\nElephant rides are not offered", "Light cotton clothing\nLight jacket for Munnar\nComfortable walking shoes\nID proof", "Yes", "Yes", "No"),
    ("KER-002", "Alleppey Houseboat Weekend - 2 Nights", "Kerala", SHORT, 2, "Kochi airport", "Kochi airport",
     "Leave Friday evening, spend a full day on a private houseboat, and be back for Monday.",
     "A short backwater break built for busy weekends. Arrive in Kochi on Friday night, drive to Alleppey, cruise the canals on a private AC houseboat with home-cooked Kerala meals and return by Sunday evening.",
     11999, None, "Private AC houseboat\nHome-cooked Kerala meals\nVillage canal cruise", "1 night resort, 1 night houseboat\nAll meals on the houseboat\nAC transfers from Kochi", "Flights to Kochi\nPersonal expenses", "Weekend departures only", "ID proof\nLight clothing", "No", "No", "No"),
    ("KER-003", "Munnar Misty Hills Weekend - 2 Nights", "Kerala", SHORT, 2, "Kochi airport", "Kochi airport",
     "Two cool nights among tea estates, waterfalls and viewpoints in Munnar.",
     "Trade the city for a mountain weekend: tea-factory tour, Mattupetty dam, Echo Point and an evening bonfire at a hillside resort.",
     9499, None, "Tea museum and factory visit\nMattupetty dam and Echo Point\nBonfire evening", "2 nights in a hill resort\nBreakfast and dinner\nAC transfers and local sightseeing", "Flights to Kochi\nLunches", "Best October to March", "Light jacket\nWalking shoes", "No", "Yes", "No"),
    ("KER-004", "Kerala Honeymoon Special - 5 Nights", "Kerala", SHORT, 5, "Kochi airport", "Kochi airport",
     "Candle-lit dinners, a private houseboat and a couple's Ayurvedic spa in Kerala.",
     "A romantic Kerala itinerary with a private houseboat night, a couple's Ayurvedic massage, a flower-decorated room in Munnar and a private sunset dinner on the beach.",
     34999, 39999, "Private houseboat night\nCouple's Ayurvedic spa\nFlower-decorated honeymoon room\nBeach dinner", "5 nights in 4-star hotels and one houseboat\nDaily breakfast, houseboat meals\nPrivate AC car with driver\nCouple's spa session", "Flights to Kochi\nLunches and dinners\nPersonal expenses", "Honeymoon perks depend on hotel availability", "ID proof\nMarriage certificate (for perks)", "Yes", "No", "Yes"),
    ("RAJ-001", "Royal Rajasthan Circuit - 7 Nights", "Rajasthan", SHORT, 7, "Jaipur airport", "Udaipur airport",
     "Jaipur, Jodhpur, Jaisalmer and Udaipur with a desert camp night and palace stays.",
     "A grand circuit through Rajasthan's four great cities: the forts and bazaars of Jaipur, the blue city of Jodhpur, a night under the stars in Jaisalmer's dunes and the lake palaces of Udaipur.",
     36999, 41999, "Amber Fort sunrise\nMehrangarh Fort\nCamel ride and desert camp at Jaisalmer\nSunset boat ride on Lake Pichola", "7 nights in heritage hotels and 1 desert camp\nDaily breakfast and dinner\nAC coach for group departures\nTour manager\nMonument entry fees", "Flights or trains to Jaipur\nLunches\nCamera fees\nPersonal expenses", "Desert camp facilities are basic but comfortable\nItinerary may change for weather", "Sunglasses and hat\nSunscreen\nLight jacket for desert nights\nComfortable shoes", "Yes", "Yes", "No"),
    ("RAJ-002", "Udaipur Lake City Weekend - 2 Nights", "Rajasthan", SHORT, 2, "Udaipur airport", "Udaipur airport",
     "Palaces, lakes and rooftop dinners in the most romantic city in India.",
     "A relaxed weekend in Udaipur: City Palace, a sunset boat ride on Lake Pichola, the old-town bazaars and a rooftop dinner overlooking the lake.",
     12499, None, "City Palace visit\nLake Pichola sunset boat ride\nRooftop lake-view dinner", "2 nights in a lake-view hotel\nDaily breakfast\nAC transfers and sightseeing", "Flights to Udaipur\nLunches and dinners", "Palace timings vary on public holidays", "Comfortable walking shoes", "No", "No", "No"),
    ("KSH-001", "Kashmir Paradise - 5 Nights", "Kashmir", SHORT, 5, "Srinagar airport", "Srinagar airport",
     "Dal Lake shikara, Gulmarg gondola and Pahalgam valleys in one summer trip.",
     "Stay on a houseboat on Dal Lake, ride the Gulmarg gondola for alpine views, wander the meadows of Pahalgam and see the Mughal gardens of Srinagar.",
     27999, 31999, "Shikara ride on Dal Lake\nGulmarg gondola\nBetaab Valley and Aru Valley\nMughal gardens", "5 nights: 2 houseboat, 3 hotel\nDaily breakfast and dinner\nPrivate AC vehicle\nTour manager on group departures", "Flights to Srinagar\nGondola tickets Phase 2\nPony rides\nPersonal expenses", "Carry valid ID for security checks\nRoute may change for weather", "Woollens\nRain jacket\nSunglasses\nID proof", "Yes", "Yes", "No"),
    ("AND-001", "Andaman Island Escape - 5 Nights", "Andaman", SHORT, 5, "Port Blair airport", "Port Blair airport",
     "Radhanagar beach, snorkelling at Elephant Beach and the Cellular Jail light show.",
     "Explore Port Blair's history, then ferry to Havelock for Radhanagar and Elephant Beach, and to Neil Island for Bharatpur beach and natural rock formations.",
     32999, None, "Radhanagar beach sunset\nSnorkelling at Elephant Beach\nCellular Jail light and sound show\nNeil Island rock bridge", "5 nights in 3-star resorts\nDaily breakfast\nFerries between islands\nAC vehicle for transfers\nSnorkelling gear", "Flights to Port Blair\nScuba diving\nLunches and dinners", "Ferry timings can change for weather\nBring a valid photo ID", "Swimwear\nReef-safe sunscreen\nID proof", "Yes", "Yes", "No"),
    ("THA-001", "Phuket & Krabi Island Escape - 5 Nights", "Thailand", SHORT, 5, "Phuket airport", "Phuket airport",
     "Phi Phi and James Bond island tours, beach days and a Thai dinner cruise.",
     "Three nights in Phuket and two in Krabi with speedboat trips to Phi Phi and Phang Nga Bay, a Thai cooking evening and free time on the beach.",
     44999, 49999, "Phi Phi island speedboat tour\nJames Bond island\nThai dinner cruise\nKrabi Four Islands tour", "5 nights in 4-star hotels\nDaily breakfast\nAirport and hotel transfers\nIsland tours with lunch\nTour manager on group departures", "International flights to Phuket\nVisa fee if applicable\nTips and personal expenses\nTravel insurance", "Sea tours depend on weather\nPassport valid for 6 months", "Passport\nSwimwear\nSunscreen\nLight cotton clothing", "Yes", "Yes", "No"),
    ("THA-002", "Bangkok & Pattaya City Break - 4 Nights", "Thailand", SHORT, 4, "Bangkok airport", "Bangkok airport",
     "Grand Palace, floating market, Coral Island and Bangkok's night markets.",
     "Two nights in Bangkok for the Grand Palace, Wat Pho and Chatuchak market, then two nights in Pattaya with a Coral Island day trip and the Alcazar show.",
     36999, None, "Grand Palace and Wat Pho\nDamnoen Saduak floating market\nCoral Island day trip\nAlcazar cabaret show", "4 nights in 4-star hotels\nDaily breakfast\nAirport transfers\nCoach sightseeing", "International flights\nVisa fee if applicable\nLunches and dinners", "Dress modestly at temples", "Passport\nModest clothing for temples", "No", "No", "No"),
    ("BAL-001", "Bali Bliss - 5 Nights", "Bali", LONG, 5, "Denpasar airport", "Denpasar airport",
     "Ubud rice terraces, Mount Batur sunrise, Uluwatu temple and Nusa Penida.",
     "Fly into Denpasar, settle into a villa in Ubud, trek Mount Batur at sunrise, then head to the cliffs of Uluwatu and take a day trip to Nusa Penida.",
     64999, 72999, "Mount Batur sunrise trek\nTegallalang rice terraces\nUluwatu Kecak fire dance\nNusa Penida day trip", "5 nights in boutique villas and resorts\nDaily breakfast\nAirport transfers and private car\nEnglish-speaking driver-guide", "International flights\nVisa on arrival fee\nLunches and dinners\nPersonal expenses", "Wear modest clothing at temples", "Passport\nSunscreen\nLight rain jacket\nWalking shoes", "Yes", "No", "Yes"),
    ("VIE-001", "Vietnam Heritage Trail - 6 Nights", "Vietnam", LONG, 6, "Hanoi airport", "Ho Chi Minh City airport",
     "Hanoi, Ha Long Bay cruise, Hoi An lanterns and the Cu Chi tunnels.",
     "A north-to-south journey: Hanoi's old quarter, an overnight cruise on Ha Long Bay, lantern-lit Hoi An, the Golden Bridge at Ba Na Hills and a finish in Ho Chi Minh City.",
     78999, 84999, "Overnight Ha Long Bay cruise\nHoi An lantern evening\nBa Na Hills Golden Bridge\nCu Chi tunnels", "6 nights: 5 hotels, 1 cruise cabin\nDaily breakfast, cruise meals\nDomestic flights between cities\nAll transfers and guided sightseeing", "International flights to Hanoi\nVisa e-fee\nLunches and dinners\nTips", "Domestic flight timings may vary", "Passport\nComfortable shoes\nLight rain jacket", "No", "No", "No"),
    ("DXB-001", "Dubai Dazzle - 4 Nights", "Dubai", SHORT, 4, "Dubai airport", "Dubai airport",
     "Burj Khalifa, desert safari with BBQ dinner, Dubai Mall and a Marina cruise.",
     "Four easy days in Dubai: the Burj Khalifa observation deck, an evening desert safari with dune bashing, the Gold Souk and a dhow cruise on Dubai Marina.",
     49999, 54999, "Burj Khalifa At the Top\nDesert safari with BBQ dinner\nDhow cruise at Dubai Marina\nDubai Mall and Fountain show", "4 nights in 4-star hotels\nDaily breakfast\nAirport transfers\nSightseeing by AC coach\nDesert safari with dinner", "International flights\nUAE visa fee\nLunches and dinners\nPersonal expenses", "Public dress code applies in Old Dubai", "Passport\nSunglasses\nLight clothing", "No", "No", "No"),
]
for i, (code, title, country, flight, nights, pickup, drop, summary, overview, price, original, hi, inc, exc, notes, carry, featured, family, luxury) in enumerate(packages):
    key = code.split("-")[0]
    gallery = ", ".join(f"{code}-{n}.jpg" for n in (2, 3, 4))
    put("Packages", 5 + i, {
        1: code, 2: title, 3: country, 4: flight, 5: nights, 7: pickup, 8: drop, 9: summary, 10: overview, 11: price, 12: original,
        13: hi, 14: inc, 15: exc, 16: notes, 17: carry, 18: f"{code}-cover.jpg", 19: gallery,
        20: featured, 21: "Published", 22: family, 23: luxury, 24: "No", 25: "No",
    })

# ------------------------------------------------------------------ Placements
placements = {
    "KER-001": ["Destinations | Kerala | Backwaters & Houseboats", "Destinations | Kerala | Hills & Tea Estates", "Group Tours | Kerala | Fixed Departures"],
    "KER-002": ["Destinations | Kerala | Backwaters & Houseboats", "Weekend Escapes | Kerala | Backwater Weekend"],
    "KER-003": ["Destinations | Kerala | Hills & Tea Estates", "Weekend Escapes | Kerala | Weekend in the Hills"],
    "KER-004": ["Destinations | Kerala | Backwaters & Houseboats", "Honeymoon | Kerala | Romantic Kerala"],
    "RAJ-001": ["Destinations | Rajasthan | Royal Heritage", "Group Tours | Rajasthan | Fixed Departures"],
    "RAJ-002": ["Destinations | Rajasthan | Royal Heritage", "Weekend Escapes | Rajasthan | Lake City Weekend"],
    "KSH-001": ["Destinations | Kashmir | Valleys & Lakes", "Group Tours | Kashmir | Summer Departures"],
    "AND-001": ["Destinations | Andaman | Beach & Diving", "Honeymoon | Andaman | Romantic Islands"],
    "THA-001": ["Destinations | Thailand | Beach & Islands", "Group Tours | Thailand | Fixed Departures", "Honeymoon | Thailand | Romantic Escapes"],
    "THA-002": ["Destinations | Thailand | City & Culture"],
    "BAL-001": ["Destinations | Bali | Culture & Nature", "Honeymoon | Bali | Romantic Escapes"],
    "VIE-001": ["Destinations | Vietnam | Heritage & Cuisine", "Group Tours | Vietnam | Fixed Departures"],
    "DXB-001": ["Destinations | Dubai | City & Desert"],
}
row = 5
for code, keys in placements.items():
    for k in keys:
        put("Placements", row, {1: code, 2: k})
        row += 1

# ------------------------------------------------------------------ Itinerary: code -> [(title, description), ...]
I = {
    "KER-001": [
        ("Arrive Kochi, drive to Munnar", "Meet your driver at Kochi airport and drive through the Western Ghats (about 4 hours) to Munnar, stopping at Cheeyappara waterfalls. Check in and enjoy an evening at leisure."),
        ("Munnar tea estates and viewpoints", "Visit a tea museum and factory, Mattupetty dam and Echo Point. Walk through the tea gardens in the afternoon."),
        ("Munnar to Thekkady", "Drive to Thekkady via cardamom and pepper plantations. Evening spice-plantation walk and a Kalaripayattu martial arts show."),
        ("Periyar and drive to Alleppey", "Morning boat ride on Periyar Lake looking for wildlife, then drive to Alleppey and board your private houseboat. Overnight on the backwaters."),
        ("Backwaters to Kovalam", "After breakfast on the houseboat, drive to Kovalam. Relax at Lighthouse Beach and enjoy the sunset."),
        ("Kovalam at leisure", "A free day for the beach, an optional Ayurvedic massage or a visit to the Padmanabhaswamy temple in Trivandrum."),
        ("Departure", "Breakfast, then transfer to Trivandrum airport for your onward journey."),
    ],
    "KER-002": [
        ("Friday: arrive Kochi, drive to Alleppey", "Arrive by evening, transfer to Alleppey and check in to a lakeside resort. Dinner at leisure."),
        ("Full day on a private houseboat", "Board your private AC houseboat at noon and cruise the canals of Kuttanad with lunch, tea and dinner served on board. Overnight on the houseboat."),
        ("Sunday: return to Kochi", "Disembark after breakfast and drive to Kochi with a stop at Fort Kochi for Chinese fishing nets. Departure by evening."),
    ],
    "KER-003": [
        ("Arrive Kochi, drive to Munnar", "Meet your driver and drive to Munnar (about 4 hours). Check in and enjoy a bonfire evening at the resort."),
        ("Munnar sightseeing", "Tea museum, Mattupetty dam, Echo Point and Eravikulam viewpoint. Return for dinner."),
        ("Return to Kochi", "Breakfast and a slow drive back with a stop at Cheeyappara waterfalls. Departure from Kochi."),
    ],
    "KER-004": [
        ("Arrive Kochi, drive to Munnar", "Private transfer to Munnar. Check in to a flower-decorated room and enjoy a welcome drink."),
        ("Munnar tea gardens", "A private tea-estate walk, Mattupetty dam and a candle-lit dinner at the resort."),
        ("Munnar to Alleppey houseboat", "Drive to Alleppey and board your private houseboat. Sunset cruise and a special dinner on the deck."),
        ("Backwaters to Kovalam", "Disembark and drive to Kovalam. Evening beach walk and a private beach dinner."),
        ("Couple's Ayurvedic spa", "A relaxing 60-minute couple's Ayurvedic massage, then a free afternoon on the beach."),
        ("Departure", "Breakfast and a transfer to Trivandrum airport."),
    ],
    "RAJ-001": [
        ("Arrive Jaipur", "Meet your driver at Jaipur airport. Check in and visit Birla Temple and the old-city bazaars in the evening."),
        ("Jaipur: forts and palaces", "Amber Fort, City Palace, Hawa Mahal and Jantar Mantar. Optional elephant-free jeep ride up Amber."),
        ("Jaipur to Jodhpur", "Drive to Jodhpur (about 6 hours) via Ajmer. Evening at leisure near the clock tower market."),
        ("Jodhpur to Jaisalmer", "Morning at Mehrangarh Fort, then drive to Jaisalmer (about 5 hours). Sunset at Gadisar Lake."),
        ("Jaisalmer and desert camp", "Explore Jaisalmer Fort and havelis. In the evening take a camel ride on the Sam dunes and stay in a desert camp with folk music."),
        ("Jaisalmer to Udaipur", "Drive to Udaipur (a long day, with breaks) and check in to a lake-view hotel."),
        ("Udaipur sightseeing", "City Palace, Saheliyon ki Bari and a sunset boat ride on Lake Pichola."),
        ("Departure", "Breakfast and a transfer to Udaipur airport."),
    ],
    "RAJ-002": [
        ("Arrive Udaipur", "Check in to a lake-view hotel. Evening walk along Lake Pichola and dinner at a rooftop restaurant."),
        ("Udaipur sightseeing", "City Palace, Jagdish Temple and the old-town bazaars. Sunset boat ride on Lake Pichola."),
        ("Departure", "Breakfast, a last stroll by the lake and transfer to the airport."),
    ],
    "KSH-001": [
        ("Arrive Srinagar, Dal Lake houseboat", "Meet your driver and check in to a houseboat on Dal Lake. Evening shikara ride at sunset."),
        ("Srinagar Mughal gardens", "Visit Nishat Bagh, Shalimar Bagh and Chashme Shahi, then browse the local handicraft shops."),
        ("Srinagar to Gulmarg", "Drive to Gulmarg (about 2 hours) and take the gondola up the Apharwat range for alpine views."),
        ("Gulmarg to Pahalgam", "Drive to Pahalgam through saffron fields and Awantipora ruins. Riverside evening."),
        ("Pahalgam sightseeing", "Betaab Valley, Aru Valley and Chandanwari, with optional pony rides."),
        ("Departure", "Drive back to Srinagar and transfer to the airport."),
    ],
    "AND-001": [
        ("Arrive Port Blair", "Airport pickup and check in. Evening Cellular Jail visit and the light and sound show."),
        ("Ferry to Havelock", "Morning ferry to Havelock Island. Afternoon at Radhanagar beach for the sunset."),
        ("Elephant Beach snorkelling", "Boat to Elephant Beach for snorkelling and water activities. Return to the resort by afternoon."),
        ("Havelock to Neil Island", "Ferry to Neil Island. Visit Bharatpur beach and the natural rock bridge at Laxmanpur."),
        ("Neil Island to Port Blair", "Ferry back to Port Blair and visit Corbyn's Cove beach for the evening."),
        ("Departure", "Breakfast and airport transfer."),
    ],
    "THA-001": [
        ("Arrive Phuket", "Airport pickup and check in. Evening at Patong beach and the walking street."),
        ("Phi Phi island tour", "Full-day speedboat tour to Phi Phi Don, Maya Bay and Monkey Beach with snorkelling and lunch."),
        ("James Bond island", "Phang Nga Bay cruise with sea-canoeing at James Bond island and lunch on board."),
        ("Phuket to Krabi", "Transfer to Krabi. Afternoon at Ao Nang beach and a sunset walk."),
        ("Krabi four islands", "Long-tail boat to Poda, Chicken, Tup and Phra Nang islands. Evening Thai dinner cruise."),
        ("Departure", "Transfer to Krabi airport for your flight home."),
    ],
    "THA-002": [
        ("Arrive Bangkok", "Airport pickup and check in. Evening at leisure at a night market."),
        ("Bangkok temples", "Grand Palace, Wat Pho and Wat Arun, then a Chao Phraya river cruise."),
        ("Bangkok to Pattaya", "Visit the Damnoen Saduak floating market and continue to Pattaya. Alcazar show in the evening."),
        ("Coral Island", "Speedboat to Coral Island for beach time and water sports."),
        ("Departure", "Transfer to Bangkok airport."),
    ],
    "BAL-001": [
        ("Arrive Denpasar, drive to Ubud", "Meet your driver and drive to Ubud (about 1.5 hours). Evening walk through Ubud's art market."),
        ("Ubud rice terraces and waterfall", "Tegallalang rice terraces, a coffee plantation and Tibumana waterfall. Afternoon free."),
        ("Mount Batur sunrise, drive to Uluwatu", "Early trek up Mount Batur for sunrise and breakfast, then drive south to Uluwatu."),
        ("Uluwatu temple and Kecak dance", "Free morning by the pool. Sunset at Uluwatu Temple with the Kecak fire dance."),
        ("Nusa Penida day trip", "Fast boat to Nusa Penida to see Kelingking Beach and Angel's Billabong. Private beach dinner."),
        ("Departure", "Breakfast and transfer to Denpasar airport."),
    ],
    "VIE-001": [
        ("Arrive Hanoi", "Airport pickup and a welcome dinner in the old quarter."),
        ("Hanoi city tour", "Ho Chi Minh Mausoleum, Temple of Literature and a cyclo ride through the old quarter."),
        ("Ha Long Bay overnight cruise", "Drive to Ha Long Bay and board a cruise with lunch, kayaking and dinner on board."),
        ("Fly to Da Nang, Hoi An", "Disembark, return to Hanoi and fly to Da Nang. Drive to Hoi An for the lantern-lit evening."),
        ("Ba Na Hills and Golden Bridge", "Cable car to Ba Na Hills and the Golden Bridge. Afternoon at leisure in Hoi An."),
        ("Fly to Ho Chi Minh City", "Morning flight to Ho Chi Minh City and a city tour including the War Remnants Museum."),
        ("Cu Chi tunnels and departure", "Visit the Cu Chi tunnels, then transfer to the airport."),
    ],
    "DXB-001": [
        ("Arrive Dubai", "Airport pickup and check in. Evening Dubai Marina walk and dhow cruise with dinner."),
        ("Dubai city tour", "Jumeirah mosque, Burj Al Arab photo stop, Dubai Frame and the Gold Souk."),
        ("Burj Khalifa and Dubai Mall", "Visit the At the Top observation deck, shop at Dubai Mall and watch the fountain show."),
        ("Desert safari", "Afternoon dune bashing, camel ride and a BBQ dinner with live entertainment in the desert."),
        ("Departure", "Breakfast and airport transfer."),
    ],
}
row = 5
for code, days in I.items():
    n = next(p[4] for p in packages if p[0] == code)
    assert len(days) == n + 1, (code, len(days), n)
    for d, (title, desc) in enumerate(days, start=1):
        put("Itinerary", row, {1: code, 2: d, 3: title, 4: desc})
        row += 1

# ------------------------------------------------------------------ PriceOptions
options = [
    ("KER-001", "Twin sharing", 28999, 32999), ("KER-001", "Triple sharing", 26999, 30999), ("KER-001", "Single room", 36999, None),
    ("RAJ-001", "Twin sharing", 36999, 41999), ("RAJ-001", "Single room", 47999, None),
    ("KSH-001", "Twin sharing", 27999, 31999), ("KSH-001", "Child with bed (5-11 yrs)", 22999, None),
    ("THA-001", "Twin sharing", 44999, 49999), ("THA-001", "Single room", 57999, None), ("THA-001", "Child without bed (2-11 yrs)", 34999, None),
    ("VIE-001", "Twin sharing", 78999, 84999), ("VIE-001", "Single room", 98999, None),
]
for i, (code, label, price, orig) in enumerate(options):
    put("PriceOptions", 5 + i, {1: code, 2: label, 3: price, 4: orig})

# ------------------------------------------------------------------ Departures
departures = {
    "KER-001": ["2027-01-15", "2027-02-12", "2027-03-12"],
    "RAJ-001": ["2027-01-22", "2027-02-19", "2027-03-19"],
    "KSH-001": ["2027-05-14", "2027-06-11", "2027-07-09"],
    "THA-001": ["2027-02-05", "2027-03-05", "2027-04-02"],
    "VIE-001": ["2027-02-26", "2027-03-26"],
}
row = 5
for code, dates in departures.items():
    for j, d in enumerate(dates):
        put("Departures", row, {1: code, 2: datetime.strptime(d, "%Y-%m-%d"), 4: 20 if code != "VIE-001" else 16, 5: "Open"})
        wb["Departures"].cell(row=row, column=2).number_format = "dd-mmm-yyyy"
        row += 1

out = ROOT / "IndianRounds_Package_Data_SAMPLE.xlsx"
wb.save(out)
print("wrote", out)
