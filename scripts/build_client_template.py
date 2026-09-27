"""Builds the client data-collection workbook (docs/client-data/IndianRounds_Package_Data_Template.xlsx).

The sheet/column layout is the contract for the bulk importer, so change both together.
Run: python scripts/build_client_template.py
"""
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.formatting.rule import FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Protection, Side
from openpyxl.utils import get_column_letter as L
from openpyxl.worksheet.datavalidation import DataValidation

OUT = Path(__file__).resolve().parent.parent / "docs" / "client-data" / "IndianRounds_Package_Data_Template.xlsx"

# Row capacity of each data sheet (data starts at row 5; row 5 holds the example).
FIRST = 5
DEST_LAST, CAT_LAST, PKG_LAST, PLC_LAST, ITN_LAST, PRC_LAST, DEP_LAST = 104, 504, 304, 1204, 4004, 804, 1504

RED, DARK, AUTO_BG, EX_BG = "CC0A00", "374151", "EEF0F3", "F3F4F6"
FONT = "Arial"
thin = Side(style="thin", color="D1D5DB")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

MENUS = ["Destinations", "Group Tours", "Weekend Escapes", "Honeymoon"]


def f(**kw):
    return Font(name=FONT, size=kw.pop("size", 10), **kw)


class Sheet:
    def __init__(self, wb, name, title, subtitle, cols, last, tab_color):
        """cols: list of (header, width, kind, required) where kind is 'input' or 'auto'."""
        self.ws = ws = wb.create_sheet(name)
        self.cols, self.last = cols, last
        ws.sheet_properties.tabColor = tab_color
        ws["A1"] = title
        ws["A1"].font = f(size=15, bold=True, color=RED)
        ws["A2"] = subtitle
        ws["A2"].font = f(size=10, color="4B5563")
        ws["A3"] = "Red header = required   |   Dark header = optional   |   Grey column = filled in automatically, do not type   |   Grey italic rows at the top = EXAMPLES, overwrite them with your first real entries"
        ws["A3"].font = f(size=9, italic=True, color="6B7280")
        ws.row_dimensions[4].height = 34
        for i, (h, w, kind, req) in enumerate(cols, start=1):
            c = ws.cell(row=4, column=i, value=h + (" *" if req else ""))
            fill = AUTO_BG if kind == "auto" else (RED if req else DARK)
            c.fill = PatternFill("solid", fgColor=fill)
            c.font = f(bold=True, color=("111827" if kind == "auto" else "FFFFFF"))
            c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
            c.border = BORDER
            ws.column_dimensions[L(i)].width = w
            for r in range(FIRST, last + 1):
                cell = ws.cell(row=r, column=i)
                cell.border = BORDER
                cell.alignment = Alignment(wrap_text=True, vertical="top")
                cell.font = f()
                if kind == "auto":
                    cell.fill = PatternFill("solid", fgColor=AUTO_BG)
                else:
                    cell.protection = Protection(locked=False)
        ws.freeze_panes = ws.cell(row=FIRST, column=3)
        ws.auto_filter.ref = f"A4:{L(len(cols))}{last}"
        ws.protection.sheet = True  # no password: Review > Unprotect Sheet if you need to
        ws.protection.autoFilter = False
        ws.protection.formatColumns = False
        ws.protection.formatRows = False
        ws.sheet_view.zoomScale = 100

    def example(self, values, row=FIRST):
        """values: dict column-index(1-based) -> value or formula."""
        for i, v in values.items():
            c = self.ws.cell(row=row, column=i)
            if v is not None:
                c.value = v
            c.font = f(italic=True, color="6B7280")
            if self.cols[i - 1][2] != "auto":
                c.fill = PatternFill("solid", fgColor=EX_BG)

    def formula(self, col, template):
        """template uses {r} for the row number; applied to every row."""
        for r in range(FIRST, self.last + 1):
            self.ws.cell(row=r, column=col, value=template.format(r=r))

    def dv(self, col, dv, first=FIRST):
        rng = f"{L(col)}{first}:{L(col)}{self.last}"
        self.ws.add_data_validation(dv)
        dv.add(rng)

    def required_when(self, key_col, req_cols):
        red = PatternFill("solid", bgColor="FECACA", fgColor="FECACA")
        for c in req_cols:
            rng = f"{L(c)}{FIRST}:{L(c)}{self.last}"
            self.ws.conditional_formatting.add(rng, FormulaRule(formula=[f'AND(${L(key_col)}{FIRST}<>"",{L(c)}{FIRST}="")'], fill=red))


def list_dv(source, prompt=None, allow_blank=True):
    dv = DataValidation(type="list", formula1=source, allow_blank=allow_blank, showErrorMessage=True, errorTitle="Pick from the list", error="Please choose a value from the drop-down list.")
    if prompt:
        dv.promptTitle, dv.prompt, dv.showInputMessage = "Tip", prompt, True
    return dv


def whole_dv(lo, hi, msg):
    return DataValidation(type="whole", operator="between", formula1=str(lo), formula2=str(hi), allow_blank=True, showErrorMessage=True, errorTitle="Whole number needed", error=msg)


wb = Workbook()
wb.remove(wb.active)

# ---------------------------------------------------------------- Read Me
rm = wb.create_sheet("ReadMe")
rm.sheet_properties.tabColor = RED
rm.sheet_view.showGridLines = False
rm.column_dimensions["A"].width = 3
rm.column_dimensions["B"].width = 26
rm.column_dimensions["C"].width = 110
rm["B2"] = "Indian Rounds - Package Data Sheet"
rm["B2"].font = f(size=20, bold=True, color=RED)
rm["B3"] = "Fill this workbook once, completely. We import everything in one go to build your website."
rm["B3"].font = f(size=11, color="4B5563")

rows = [
    ("HOW THE WEBSITE IS ORGANISED", None),
    ("Menus", "Your website has four package menus: Destinations, Group Tours, Weekend Escapes and Honeymoon (plus Special Offers, which fills itself automatically from packages that have a lower price than their original price)."),
    ("Structure", "In every menu: Country  >  Category (for example Beach Holidays, Adventure, Family)  >  Packages. You decide the categories for each country in each menu."),
    ("A package, many places", "One package is entered ONCE in the Packages sheet, then listed under as many menus / countries / categories as you like in the Placements sheet. Never type the same package twice."),
    ("", None),
    ("FILL THE SHEETS IN THIS ORDER", None),
    ("1  Destinations", "One row per country / destination you sell (e.g. Thailand, Vietnam, Kerala). Add the tagline, best time to visit, a short description and a cover photo file name."),
    ("2  Categories", "For each menu and each country, list the categories you want (e.g. Destinations | Thailand | Beach Holidays; Honeymoon | Thailand | Romantic Escapes). The 'Key' column fills itself."),
    ("3  Packages", "One row per package: title, country, nights, prices, summary, overview, highlights, inclusions, exclusions, other info and photos. Every package needs a unique Package ID you invent, e.g. TH-001."),
    ("4  Placements", "Say where each package appears: pick the Package ID and then the menu | country | category from the drop-down. Add one row for every place the package should show."),
    ("5  Itinerary", "One row per day of each package: Package ID, day number, day title and what happens that day."),
    ("6  PriceOptions", "Optional. Extra price choices for a package (e.g. Twin sharing, Single room, Child with bed)."),
    ("7  Departures", "Group Tours only: one row per departure date with the number of seats available."),
    ("DataCheck", "Do not type here. It shows, for each package, exactly what is still missing. Aim for every package to say Complete."),
    ("", None),
    ("RULES", None),
    ("Colours", "Red header = must be filled.  Dark header = optional.  Grey column = fills itself, cannot be edited (the sheets are protected without a password so formulas can't be broken by accident)."),
    ("Drop-downs", "Cells with a small arrow only accept values from the list - pick, don't type. This avoids spelling mismatches."),
    ("Several items in one cell", "For Highlights, Inclusions, Exclusions, Other info and Must carry: type ONE item per line. Press Alt+Enter (Windows) or Option+Return (Mac) to start a new line inside the same cell. Do not use bullets or numbers."),
    ("Prices", "In Indian Rupees, per person, whole numbers, WITHOUT GST (the website adds 5% GST). Original price is optional: enter the higher 'MRP' price to show a discount."),
    ("Package ID", "Letters and numbers only, no spaces, unique per package (e.g. BALI-01). Every other sheet refers to the package by this ID."),
    ("Do not", "Do not rename, delete, reorder or insert columns or sheets. Do not merge cells. Do not leave blank rows between entries."),
    ("The example rows", "The first grey italic rows of each sheet are a complete EXAMPLE (Bali, package EX-001). Overwrite them with your first real entries, or delete their contents. Anything marked EXAMPLE / EX- is ignored when we import."),
    ("", None),
    ("PHOTOS", None),
    ("Send separately", "Send photos in a folder alongside this file (zip it). Type only the FILE NAME in the sheet, exactly as saved, including .jpg."),
    ("Naming", "Country cover:  country-thailand.jpg      Category cover:  cat-thailand-beach.jpg      Package cover:  TH-001-cover.jpg      Package gallery:  TH-001-2.jpg, TH-001-3.jpg ..."),
    ("Quality", "JPG, landscape, at least 1600 x 900 px, under 1.5 MB each, no text or logos on the picture. Only photos you own or are licensed to use."),
    ("", None),
    ("QUESTIONS", "enquiry@indianrounds.in  |  +91 87789 55009"),
]
r = 5
for k, v in rows:
    if v is None and k:
        rm.cell(row=r, column=2, value=k).font = f(size=11, bold=True, color="FFFFFF")
        for col in (2, 3):
            rm.cell(row=r, column=col).fill = PatternFill("solid", fgColor=RED)
        rm.row_dimensions[r].height = 20
    elif k or v:
        a = rm.cell(row=r, column=2, value=k)
        b = rm.cell(row=r, column=3, value=v)
        a.font, b.font = f(bold=True), f()
        a.alignment = Alignment(vertical="top", wrap_text=True)
        b.alignment = Alignment(vertical="top", wrap_text=True)
        a.border = b.border = Border(bottom=Side(style="hair", color="D1D5DB"))
        rm.row_dimensions[r].height = 15 * (1 + len(v) // 105)
    r += 1

# ---------------------------------------------------------------- Lists (needed early for validations)
ls = wb.create_sheet("Lists")
ls.sheet_properties.tabColor = "9CA3AF"
lists = {
    "A": ("Region", ["India", "International"]),
    "B": ("Yes / No", ["Yes", "No"]),
    "C": ("Package status", ["Published", "Draft"]),
    "D": ("Flight type", ["Domestic / short-haul", "International long-haul"]),
    "E": ("Menu", MENUS),
    "F": ("Departure status", ["Open", "Sold out"]),
}
for col, (head, vals) in lists.items():
    ls[f"{col}1"] = head
    ls[f"{col}1"].font = f(bold=True)
    ls.column_dimensions[col].width = 26
    for i, v in enumerate(vals, start=2):
        ls[f"{col}{i}"] = v
        ls[f"{col}{i}"].font = f()
ls["H1"] = "Reference lists used by the drop-downs. Please do not edit."
ls["H1"].font = f(italic=True, color="6B7280")
ls.protection.sheet = True

# ---------------------------------------------------------------- Destinations
D = Sheet(wb, "Destinations", "1. Destinations (countries)",
          "One row per country / destination you sell. Menu: Destinations.", [
              ("Region", 16, "input", True), ("Country / destination name", 26, "input", True),
              ("Tagline (e.g. Beaches | Culture | Adventure)", 34, "input", True), ("Best time to visit", 22, "input", False),
              ("About this destination (2-4 sentences)", 60, "input", False), ("Cover image file name", 26, "input", True),
              ("Show on homepage?", 14, "input", False), ("Display order (1 = first)", 12, "input", False),
              ("Packages (auto)", 11, "auto", False), ("Starting price (auto)", 14, "auto", False),
          ], DEST_LAST, RED)
D.example({1: "International", 2: "EXAMPLE Bali", 3: "Beaches | Temples | Wellness", 4: "April to October",
           5: "Bali blends volcano hikes, rice terraces, temple ceremonies and some of Asia's best beaches. Perfect for couples, families and friends.",
           6: "country-bali.jpg", 7: "Yes", 8: 1})
D.formula(9, '=IF(B{r}="","",COUNTIF(Packages!$C$5:$C$%d,B{r}))' % PKG_LAST)
D.formula(10, '=IF(OR(B{r}="",I{r}=0),"",_xlfn.MINIFS(Packages!$K$5:$K$%d,Packages!$C$5:$C$%d,B{r}))' % (PKG_LAST, PKG_LAST))
D.dv(1, list_dv("=Lists!$A$2:$A$3"))
D.dv(7, list_dv("=Lists!$B$2:$B$3"))
D.dv(8, whole_dv(1, 999, "Enter a whole number, 1 or more."))
D.ws.column_dimensions["J"].number_format = "#,##0"
D.required_when(2, [1, 3, 6])
for rr in range(FIRST, DEST_LAST + 1):
    D.ws.cell(row=rr, column=10).number_format = '"Rs "#,##0'
    D.ws.cell(row=rr, column=2).font = f(bold=True) if rr > FIRST else f(bold=True, italic=True, color="6B7280")

# ---------------------------------------------------------------- Categories
C = Sheet(wb, "Categories", "2. Categories under each country, per menu",
          "Decide the categories customers browse by. Example: Honeymoon | Bali | Romantic Escapes.", [
              ("Menu", 18, "input", True), ("Country (from Destinations)", 26, "input", True),
              ("Category name", 26, "input", True), ("Short description (1-2 lines)", 46, "input", False),
              ("Category image file name", 26, "input", False), ("Display order", 10, "input", False),
              ("Packages (auto)", 11, "auto", False), ("Key (auto) - used by Placements", 48, "auto", False),
          ], CAT_LAST, "B45309")
C.example({1: "Destinations", 2: "EXAMPLE Bali", 3: "Beach & Islands", 4: "Sun, sand and island hopping.", 5: "cat-bali-beach.jpg", 6: 1})
C.example({1: "Group Tours", 2: "EXAMPLE Bali", 3: "Fixed Departures", 4: "Guided small-group trips on set dates.", 6: 1}, row=FIRST + 1)
C.formula(8, '=IF(OR(A{r}="",B{r}="",C{r}=""),"",A{r}&" | "&B{r}&" | "&C{r})')
C.formula(7, '=IF(H{r}="","",COUNTIF(Placements!$B$5:$B$%d,H{r}))' % PLC_LAST)
C.dv(1, list_dv("=Lists!$E$2:$E$5"))
C.dv(2, list_dv("=Destinations!$B$5:$B$%d" % DEST_LAST, "Pick a country you added on the Destinations sheet."))
C.dv(6, whole_dv(1, 999, "Enter a whole number, 1 or more."))
C.required_when(1, [2, 3])
C.required_when(2, [1, 3])

# ---------------------------------------------------------------- Packages
P = Sheet(wb, "Packages", "3. Packages",
          "One row per package. Enter each package once here, then place it under menus on the Placements sheet.", [
              ("Package ID (unique, e.g. BALI-01)", 16, "input", True), ("Package title", 34, "input", True),
              ("Country (from Destinations)", 20, "input", True), ("Flight type", 22, "input", True),
              ("Nights", 8, "input", True), ("Days (auto)", 8, "auto", False),
              ("Pickup point", 20, "input", False), ("Drop point", 20, "input", False),
              ("Short summary (max 300 characters)", 44, "input", True), ("Overview (full description)", 60, "input", True),
              ("Price per person, Rs (excl. GST)", 16, "input", True), ("Original / MRP price, Rs (optional)", 16, "input", False),
              ("Highlights (one per line)", 40, "input", False), ("Inclusions (one per line)", 40, "input", True),
              ("Exclusions (one per line)", 40, "input", True), ("Other info / notes (one per line)", 40, "input", False),
              ("Must carry (one per line)", 34, "input", False), ("Cover image file name", 24, "input", True),
              ("Gallery image file names (comma separated)", 34, "input", False), ("Featured on homepage?", 12, "input", False),
              ("Status", 12, "input", False), ("Also under Family?", 10, "input", False), ("Also under Luxury?", 10, "input", False),
              ("Also under Festivals / Events?", 12, "input", False), ("Also under Christmas & New Year?", 12, "input", False),
              ("Placements (auto)", 11, "auto", False),
          ], PKG_LAST, "047857")
P.example({
    1: "EX-001", 2: "Bali Bliss - 5 Nights Beaches, Temples & Waterfalls", 3: "EXAMPLE Bali", 4: "International long-haul",
    5: 5, 6: None, 7: "Chennai airport", 8: "Chennai airport",
    9: "Five relaxed nights in Bali: Ubud rice terraces, Uluwatu sunsets, Nusa Penida day trip and a private beach dinner.",
    10: "Fly into Denpasar and settle into a boutique villa in Ubud before heading south to the cliffs of Uluwatu. Includes temple visits, a waterfall trek, a Nusa Penida island day trip and time to unwind.",
    11: 64999, 12: 72999,
    13: "Sunrise at Mount Batur\nNusa Penida day trip\nUluwatu Kecak fire dance\nPrivate beach dinner",
    14: "Return international flights from Chennai\n5 nights in 4-star hotels / villas\nDaily breakfast\nAirport transfers and private car for sightseeing\nEnglish-speaking driver-guide",
    15: "Visa fee\nLunches and dinners unless mentioned\nTravel insurance\nPersonal expenses and tips",
    16: "Passport valid for 6 months\nItinerary can change for weather or safety\nCarry modest clothing for temples",
    17: "Passport\nSunscreen and hat\nLight rain jacket\nComfortable walking shoes",
    18: "EX-001-cover.jpg", 19: "EX-001-2.jpg, EX-001-3.jpg, EX-001-4.jpg", 20: "Yes", 21: "Published", 22: "Yes", 23: "No", 24: "No", 25: "No",
})
P.formula(6, '=IF(E{r}="","",E{r}+1)')
P.formula(26, '=IF(A{r}="","",COUNTIF(Placements!$A$5:$A$%d,A{r}))' % PLC_LAST)
P.dv(3, list_dv("=Destinations!$B$5:$B$%d" % DEST_LAST, "Pick a country you added on the Destinations sheet."))
P.dv(4, list_dv("=Lists!$D$2:$D$3", "Domestic / short-haul = trips within India or short flights. Long-haul = international trips with a long flight."))
P.dv(5, whole_dv(1, 60, "Nights must be a whole number between 1 and 60."))
P.dv(11, whole_dv(1, 5000000, "Enter the price as a whole number of rupees, no commas or symbols."))
P.dv(12, whole_dv(1, 5000000, "Enter the price as a whole number of rupees, no commas or symbols."))
for c in (20, 22, 23, 24, 25):
    P.dv(c, list_dv("=Lists!$B$2:$B$3"))
P.dv(21, list_dv("=Lists!$C$2:$C$3", "Draft = saved but hidden on the website."))
P.dv(9, DataValidation(type="textLength", operator="lessThanOrEqual", formula1="300", allow_blank=True, showErrorMessage=True, errorTitle="Too long", error="The short summary can be at most 300 characters. Put the rest in the Overview."))
P.dv(1, DataValidation(type="custom", formula1=f'AND(COUNTIF($A${FIRST}:$A${PKG_LAST},A{FIRST})=1,ISERROR(FIND(" ",A{FIRST})))', allow_blank=True, showErrorMessage=True, errorTitle="Package ID", error="Package ID must be unique and must not contain spaces."))
P.required_when(1, [2, 3, 4, 5, 9, 10, 11, 14, 15, 18])
P.required_when(2, [1])
for rr in range(FIRST, PKG_LAST + 1):
    for c in (11, 12):
        P.ws.cell(row=rr, column=c).number_format = "#,##0"
    for c in (13, 14, 15, 16, 17, 10, 9):
        P.ws.cell(row=rr, column=c).alignment = Alignment(wrap_text=True, vertical="top")
P.ws.row_dimensions[FIRST].height = 90

# ---------------------------------------------------------------- Placements
PL = Sheet(wb, "Placements", "4. Placements - where each package appears",
           "One row per place a package should be listed. A package can have many rows (e.g. Destinations and Honeymoon).", [
               ("Package ID", 16, "input", True), ("Menu | Country | Category (pick from list)", 52, "input", True),
               ("Menu (auto)", 16, "auto", False), ("Country (auto)", 18, "auto", False), ("Category (auto)", 22, "auto", False),
               ("Package title (auto)", 40, "auto", False), ("Check (auto)", 44, "auto", False),
           ], PLC_LAST, "7C3AED")
PL.example({1: "EX-001", 2: "Destinations | EXAMPLE Bali | Beach & Islands"})
PL.example({1: "EX-001", 2: "Group Tours | EXAMPLE Bali | Fixed Departures"}, row=FIRST + 1)
PL.formula(3, '=IFERROR(INDEX(Categories!$A$5:$A$%d,MATCH(B{r},Categories!$H$5:$H$%d,0)),"")' % (CAT_LAST, CAT_LAST))
PL.formula(4, '=IFERROR(INDEX(Categories!$B$5:$B$%d,MATCH(B{r},Categories!$H$5:$H$%d,0)),"")' % (CAT_LAST, CAT_LAST))
PL.formula(5, '=IFERROR(INDEX(Categories!$C$5:$C$%d,MATCH(B{r},Categories!$H$5:$H$%d,0)),"")' % (CAT_LAST, CAT_LAST))
PL.formula(6, '=IFERROR(INDEX(Packages!$B$5:$B$%d,MATCH(A{r},Packages!$A$5:$A$%d,0)),"")' % (PKG_LAST, PKG_LAST))
PL.formula(7, ('=IF(AND(A{r}="",B{r}=""),"",IF(A{r}="","Pick a Package ID",IF(B{r}="","Pick a Menu | Country | Category",'
               'IF(F{r}="","Package ID not found on the Packages sheet",IF(D{r}<>INDEX(Packages!$C$5:$C$%d,MATCH(A{r},Packages!$A$5:$A$%d,0)),'
               '"Note: this country differs from the package\'s own country","OK")))))') % (PKG_LAST, PKG_LAST))
PL.dv(1, list_dv("=Packages!$A$5:$A$%d" % PKG_LAST, "Pick a Package ID from the Packages sheet."))
PL.dv(2, list_dv("=Categories!$H$5:$H$%d" % CAT_LAST, "Add the menu / country / category on the Categories sheet first."))
PL.required_when(1, [2])
PL.required_when(2, [1])

# ---------------------------------------------------------------- Itinerary
IT = Sheet(wb, "Itinerary", "5. Itinerary - one row per day",
           "Day 1, Day 2 ... for every package. The number of days must match the package's Days.", [
               ("Package ID", 16, "input", True), ("Day number", 9, "input", True), ("Day title (e.g. Arrive Denpasar, transfer to Ubud)", 44, "input", True),
               ("What happens this day", 90, "input", True), ("Package title (auto)", 40, "auto", False),
           ], ITN_LAST, "0369A1")
IT.example({1: "EX-001", 2: 1, 3: "Arrive Denpasar, transfer to Ubud", 4: "Meet your driver at the airport and drive to Ubud (about 1.5 hours). Check in, freshen up and take an evening walk through Ubud's art market. Overnight in Ubud."})
for n, (dn, title, desc) in enumerate([
    (1, 'Arrive Denpasar, transfer to Ubud', "Meet your driver at the airport and drive to Ubud (about 1.5 hours). Check in, freshen up and take an evening walk through Ubud's art market. Overnight in Ubud."),
    (2, 'Ubud: rice terraces and waterfall', 'Visit the Tegallalang rice terraces, a coffee plantation and Tibumana waterfall. Afternoon at leisure. Overnight in Ubud.'),
    (3, 'Sunrise at Mount Batur, drive to Uluwatu', 'Early sunrise trek at Mount Batur followed by breakfast with a view. Drive south to Uluwatu and check in. Overnight in Uluwatu.'),
    (4, 'Uluwatu temple and Kecak fire dance', 'Free morning by the pool. In the evening visit Uluwatu Temple for sunset and watch the traditional Kecak fire dance. Overnight in Uluwatu.'),
    (5, 'Nusa Penida island day trip', "Fast boat to Nusa Penida to see Kelingking Beach and Angel's Billabong, with lunch on the island. Private beach dinner in the evening."),
    (6, 'Departure', 'Breakfast, then transfer to Denpasar airport for your flight home.'),
][1:], start=1):
    IT.example({1: "EX-001", 2: dn, 3: title, 4: desc}, row=FIRST + n)
IT.formula(5, '=IFERROR(INDEX(Packages!$B$5:$B$%d,MATCH(A{r},Packages!$A$5:$A$%d,0)),"")' % (PKG_LAST, PKG_LAST))
IT.dv(1, list_dv("=Packages!$A$5:$A$%d" % PKG_LAST, "Pick a Package ID from the Packages sheet."))
IT.dv(2, whole_dv(1, 60, "Day number must be a whole number, 1 or more."))
IT.required_when(1, [2, 3, 4])
IT.required_when(2, [1])

# ---------------------------------------------------------------- PriceOptions
PR = Sheet(wb, "PriceOptions", "6. Price options (optional)",
           "Only if a package has different prices for different choices (room type, age, season). Otherwise skip this sheet.", [
               ("Package ID", 16, "input", True), ("Option name (e.g. Twin sharing)", 36, "input", True),
               ("Price per person, Rs (excl. GST)", 16, "input", True), ("Original / MRP price, Rs (optional)", 16, "input", False),
               ("Package title (auto)", 40, "auto", False),
           ], PRC_LAST, "0F766E")
PR.example({1: "EX-001", 2: "Twin sharing", 3: 64999, 4: 72999})
PR.formula(5, '=IFERROR(INDEX(Packages!$B$5:$B$%d,MATCH(A{r},Packages!$A$5:$A$%d,0)),"")' % (PKG_LAST, PKG_LAST))
PR.dv(1, list_dv("=Packages!$A$5:$A$%d" % PKG_LAST, "Pick a Package ID from the Packages sheet."))
PR.dv(3, whole_dv(1, 5000000, "Enter the price as a whole number of rupees."))
PR.dv(4, whole_dv(1, 5000000, "Enter the price as a whole number of rupees."))
PR.required_when(1, [2, 3])
for rr in range(FIRST, PRC_LAST + 1):
    for c in (3, 4):
        PR.ws.cell(row=rr, column=c).number_format = "#,##0"

# ---------------------------------------------------------------- Departures
DP = Sheet(wb, "Departures", "7. Departures (Group Tours)",
           "One row per fixed departure date. Needed for every package placed under the Group Tours menu.", [
               ("Package ID", 16, "input", True), ("Start date", 14, "input", True), ("End date (auto = start + nights)", 16, "auto", False),
               ("Seats available", 12, "input", True), ("Status", 12, "input", False), ("Package title (auto)", 40, "auto", False),
           ], DEP_LAST, "BE123C")
DP.example({1: "EX-001", 2: date(2027, 3, 12), 4: 20, 5: "Open"})
DP.formula(3, '=IF(OR(A{r}="",B{r}=""),"",IFERROR(B{r}+INDEX(Packages!$E$5:$E$%d,MATCH(A{r},Packages!$A$5:$A$%d,0)),""))' % (PKG_LAST, PKG_LAST))
DP.formula(6, '=IFERROR(INDEX(Packages!$B$5:$B$%d,MATCH(A{r},Packages!$A$5:$A$%d,0)),"")' % (PKG_LAST, PKG_LAST))
DP.dv(1, list_dv("=Packages!$A$5:$A$%d" % PKG_LAST, "Pick a Package ID from the Packages sheet."))
DP.dv(2, DataValidation(type="date", operator="greaterThanOrEqual", formula1="DATE(2026,1,1)", allow_blank=True, showErrorMessage=True, errorTitle="Date needed", error="Enter a real date, e.g. 12-03-2027."))
DP.dv(4, whole_dv(1, 500, "Seats must be a whole number between 1 and 500."))
DP.dv(5, list_dv("=Lists!$F$2:$F$3"))
DP.required_when(1, [2, 4])
DP.required_when(2, [1])
for rr in range(FIRST, DEP_LAST + 1):
    for c in (2, 3):
        DP.ws.cell(row=rr, column=c).number_format = "dd-mmm-yyyy"

# ---------------------------------------------------------------- DataCheck
dc = wb.create_sheet("DataCheck")
dc.sheet_properties.tabColor = "16A34A"
dc["A1"] = "Data check - what is still missing"
dc["A1"].font = f(size=15, bold=True, color=RED)
dc["A2"] = "Do not type on this sheet. It updates as you fill the others. Goal: every package says Complete."
dc["A2"].font = f(color="4B5563")
summary = [
    ("Packages entered", f'=COUNTIF(A10:A{9 + PKG_LAST - FIRST + 1},"?*")'),
    ("Complete", f'=COUNTIF(J10:J{9 + PKG_LAST - FIRST + 1},"Complete")'),
    ("Still incomplete", "=B4-B5"),
    ("Destinations (countries)", f'=COUNTIF(Destinations!$B$5:$B${DEST_LAST},"?*")'),
    ("Categories", f'=COUNTIF(Categories!$H$5:$H${CAT_LAST},"?*")'),
]
for i, (k, fx) in enumerate(summary, start=4):
    dc[f"A{i}"], dc[f"B{i}"] = k, fx
    dc[f"A{i}"].font, dc[f"B{i}"].font = f(bold=True), f(bold=True, color=RED)
    dc[f"B{i}"].alignment = Alignment(horizontal="left")
dc["D4"], dc["D5"], dc["D6"], dc["D7"] = "Placements in Destinations", "Placements in Group Tours", "Placements in Weekend Escapes", "Placements in Honeymoon"
for i, m in enumerate(MENUS):
    dc[f"D{4 + i}"].font = f(bold=True)
    dc[f"E{4 + i}"] = f'=COUNTIF(Placements!$C$5:$C${PLC_LAST},"{m}")'
    dc[f"E{4 + i}"].font = f(bold=True, color=RED)
    dc[f"E{4 + i}"].alignment = Alignment(horizontal="left")
heads = ["Package ID", "Package title", "Required fields missing", "Placements", "Itinerary days entered", "Days expected", "Itinerary complete?", "In Group Tours?", "Departures", "Status", "What is missing"]
widths = [16, 40, 14, 11, 14, 11, 12, 12, 11, 12, 60]
for i, (h, w) in enumerate(zip(heads, widths), start=1):
    c = dc.cell(row=9, column=i, value=h)
    c.fill, c.font, c.border = PatternFill("solid", fgColor=DARK), f(bold=True, color="FFFFFF"), BORDER
    c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
    dc.column_dimensions[L(i)].width = w
dc.row_dimensions[9].height = 32
for n in range(PKG_LAST - FIRST + 1):
    r, p = 10 + n, FIRST + n
    req = "+".join(f'(Packages!{col}{p}="")' for col in "BCDEIJKNOR")
    vals = [
        f'=IF(Packages!A{p}="","",Packages!A{p})',
        f'=IF(A{r}="","",Packages!B{p})',
        f'=IF(A{r}="","",{req})',
        f'=IF(A{r}="","",COUNTIF(Placements!$A$5:$A${PLC_LAST},A{r}))',
        f'=IF(A{r}="","",COUNTIF(Itinerary!$A$5:$A${ITN_LAST},A{r}))',
        f'=IF(A{r}="","",IF(Packages!F{p}="",0,Packages!F{p}))',
        f'=IF(A{r}="","",IF(AND(F{r}>0,E{r}=F{r}),"Yes","No"))',
        f'=IF(A{r}="","",IF(COUNTIFS(Placements!$A$5:$A${PLC_LAST},A{r},Placements!$C$5:$C${PLC_LAST},"Group Tours")>0,"Yes","No"))',
        f'=IF(A{r}="","",COUNTIF(Departures!$A$5:$A${DEP_LAST},A{r}))',
        f'=IF(A{r}="","",IF(AND(C{r}=0,D{r}>0,G{r}="Yes",OR(H{r}<>"Yes",I{r}>0)),"Complete","Incomplete"))',
        f'=IF(OR(A{r}="",J{r}="Complete"),"",IF(C{r}>0,"required fields; ","")&IF(D{r}=0,"no placement; ","")&IF(G{r}="No","itinerary days do not match; ","")&IF(AND(H{r}="Yes",I{r}=0),"no departure dates; ",""))',
    ]
    for i, v in enumerate(vals, start=1):
        c = dc.cell(row=r, column=i, value=v)
        c.font, c.border = f(), BORDER
green, amber = PatternFill("solid", bgColor="BBF7D0", fgColor="BBF7D0"), PatternFill("solid", bgColor="FDE68A", fgColor="FDE68A")
dc.conditional_formatting.add(f"J10:J{9 + PKG_LAST - FIRST + 1}", FormulaRule(formula=['J10="Complete"'], fill=green))
dc.conditional_formatting.add(f"J10:J{9 + PKG_LAST - FIRST + 1}", FormulaRule(formula=['J10="Incomplete"'], fill=amber))
dc.freeze_panes = "C10"
dc.protection.sheet = True

# order: ReadMe first, Lists last
wb._sheets = [wb[n] for n in ["ReadMe", "Destinations", "Categories", "Packages", "Placements", "Itinerary", "PriceOptions", "Departures", "DataCheck", "Lists"]]
from openpyxl.worksheet.properties import PageSetupProperties
for ws in wb:
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
wb.active = 0
wb.calculation.fullCalcOnLoad = True
OUT.parent.mkdir(parents=True, exist_ok=True)
wb.save(OUT)
print("wrote", OUT)
