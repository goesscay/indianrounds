# User acceptance test script

For the client's team to run on **staging** (Razorpay in **test mode**, real catalogue loaded, emails going to a test inbox). Record Pass / Fail / Notes for each case; every Fail needs a screenshot and the URL. Sign-off requires all **Must** cases to pass.

Test cards and UPI ids: use Razorpay's published test credentials (Razorpay docs > Test Card Details). A failed-payment case uses their failure test card / cancel in the payment window.

Use a phone (375 px wide) for at least cases C1, C4 and C10, and a desktop browser for the rest.

## A. Public site

| # | Case | Steps | Expected | Must |
| --- | --- | --- | --- | --- |
| A1 | Home | Open the home page | Hero, search bar, popular destinations, trending tours, testimonials, blog strip; no broken images; header/footer links work | Yes |
| A2 | Search and filter | Tours > filter by destination, duration and price; sort | Results and counts update; empty result explains itself | Yes |
| A3 | Tour detail | Open a tour | Overview, itinerary, inclusions/exclusions, must-carry, gallery, price; "Check Dates & Costing" works | Yes |
| A4 | Dates & costing | Pick a departure and a variant; change travellers | Price = unit price x travellers + GST shown; sold-out dates are not selectable | Yes |
| A5 | Destination page | Open a destination | Tours listed and sortable; overview, best time; related guides | No |
| A6 | Collections | Weekend Getaways, Events & Festivals, etc. | Only tagged, published tours with upcoming departures | No |
| A7 | Blog | Filter by type/destination; open a post | Read time, author, date, related posts; no raw HTML shown | No |
| A8 | Enquiry forms | Callback, quote, contact, corporate, custom trip | Validation messages are clear; success message; the enquiry appears in Admin > Leads under the right team | Yes |
| A9 | Careers | Apply with a PDF résumé, and with a .exe | PDF accepted; .exe rejected with a message; appears in Admin > Careers | No |
| A10 | Legal pages | Terms, Privacy, Disclaimer, Customer support | Final approved text, correct business details | Yes |

## B. Account and the login gate

| # | Case | Steps | Expected | Must |
| --- | --- | --- | --- | --- |
| B1 | Login required before payment | Logged out: choose a date, fill the checkout form, click continue | Redirected to log in / sign up; after signing up the entered details are kept and checkout continues to payment | Yes |
| B2 | Register | Sign up with a weak password, then a valid one (10+ chars, letters and numbers) | Weak rejected with a clear message; valid succeeds | Yes |
| B3 | Login errors | Wrong password 5 times | Generic error each time, then a "try again in N seconds" message; no hint whether the email exists | Yes |
| B4 | Forgot / reset password | Request a reset, follow the emailed link | Same message for known and unknown emails; reset works; old sessions signed out | Yes |
| B5 | Google sign-in | Continue with Google (if enabled) | Lands back in the site signed in | No |
| B6 | Profile | Edit name, phone, GST state; change password | Saved; other devices signed out after a password change | No |

## C. Booking and payment (Razorpay test mode)

| # | Case | Steps | Expected | Must |
| --- | --- | --- | --- | --- |
| C1 | Happy path | Book 2 travellers; pay the advance with a test card | Booking *confirmed*; confirmation email; instalment schedule shown; invoice available | Yes |
| C2 | GST split | Book once with GST state = company state, once with a different state | CGST+SGST vs IGST on the invoice; totals match the checkout summary | Yes |
| C3 | Failed payment | Start payment, then fail/cancel it | Clear message; booking remains *pending*; can retry; seats still held for the countdown | Yes |
| C4 | Reservation expiry | Start a booking, do not pay, wait 15+ minutes | Reservation released, seats return to the batch; the page says it expired and offers to choose again | Yes |
| C5 | Last seat contention | Two people try to book the last seat at the same time (two browsers) | Exactly one succeeds; the other is told the date is full | Yes |
| C6 | Later instalments | From My bookings, pay the second instalment | Milestone marked paid; balance updates | Yes |
| C7 | Reminders | Ask the developer to run `php artisan payments:send-reminders` with a due date inside 3 days | One reminder email per due instalment; not repeated the next day | No |
| C8 | Webhook-only confirmation | Developer disables the browser callback (or closes the tab right after paying) | Booking still becomes *confirmed* via the webhook | Yes |
| C9 | Credit note | Cancel a booking (C10), then use the credit note on a new booking | Credit applied to a whole note; balance handled; note marked redeemed | Yes |
| C10 | Cancellation | Cancel a confirmed booking at different distances from departure | The preview matches the policy tier; outcome is credit note (or refund request, per the chosen mode); seats released; cancellation email | Yes |
| C11 | Invoice | Open the invoice | Correct name, GST state, line, tax, totals, invoice number | Yes |

## D. Back office

| # | Case | Steps | Expected | Must |
| --- | --- | --- | --- | --- |
| D1 | Roles | Log in as each of: Super Admin, a department Admin, a department Staff | Menu shows only what that role may use; forbidden pages/actions are refused, not just hidden | Yes |
| D2 | Team management | Create a staff user; deactivate them | Invite email arrives; deactivated user is signed out and cannot log in | Yes |
| D3 | Tours | Create a tour as Staff (draft), publish as Admin | Staff cannot publish; Admin can; it appears on the site within a minute | Yes |
| D4 | Blog | Staff drafts a post; Admin publishes | Same rule; unpublished posts never appear publicly | No |
| D5 | Leads by team | Submit corporate, custom and quote enquiries | Corporate team sees only corporate; Personalised only custom; Sales sees callback/quote/contact; Admins see all | Yes |
| D6 | Approvals | As Staff, issue a credit note or refund above the limit | Goes to the approval queue; an Admin approves or rejects; outcome recorded | Yes |
| D7 | Refunds | Process a pending refund | Status changes; audit entry created | Yes |
| D8 | Grievances | Customer raises a ticket; staff acknowledge, escalate, resolve | SLA dates shown; customer sees status updates | No |
| D9 | Careers | HR reviews an application and downloads the résumé | Only HR/Admin can; download works | No |
| D10 | Audit log | Review Admin > Audit log after D3-D9 | Every change is listed with who, what, when | Yes |

## E. Quality

| # | Case | Steps | Expected | Must |
| --- | --- | --- | --- | --- |
| E1 | Mobile | Repeat A1, A3, C1 on a phone | Nothing overflows sideways; buttons are tappable; forms usable | Yes |
| E2 | Keyboard | Use only Tab / Enter on the home page, a tour and the checkout | Focus is always visible; "Skip to main content" works; dialogs close with Esc | Yes |
| E3 | Speed | Load the home page on a mid-range phone on 4G | Usable within ~3 s; images load progressively | No |
| E4 | Errors | Open a URL that does not exist | Friendly 404 with a way back | No |
| E5 | Old links | Open a few old-site URLs (if any) | Redirect to the matching new page | Yes if there is an old site |

## Sign-off

| Role | Name | Date | Decision (Accepted / Accepted with conditions / Rejected) |
| --- | --- | --- | --- |
| Business owner | | | |
| Finance (payments, GST, refunds) | | | |
| Operations | | | |
| Developer | | | |
