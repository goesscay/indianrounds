export const site = {
  name: "Indian Rounds",
  tagline: "Travel Beyond Borders",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  phone: "+91 87789 55009",
  phoneHref: "tel:+918778955009",
  whatsapp: "918778955009",
  email: "enquiry@indianrounds.in",
  address: "13/8 EKR Avenue, Yathavar Street, Kovur, Irandam Kattalai, Chennai, Tamil Nadu 600128",
  hours: "Mon - Sat: 9:00 AM - 7:00 PM",
  socials: [
    { label: "Facebook", href: "https://facebook.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
} as const;

/** Top bar (white): compact utility links. The logo itself is the "Home" link. */
export const topNavLinks = [
  { href: "/bookings", label: "My Bookings" },
  { href: "/blog", label: "Travel Stories" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

/** Second bar (brand red): the main catalogue/category navigation. */
export const categoryNavLinks = [
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Tours" },
  { href: "/tours", label: "Holiday Packages" },
  { href: "/tours?type=group", label: "Group Journeys" },
  { href: "/collections/weekend-getaways", label: "Weekend Escapes" },
  { href: "/collections/couples-honeymoon", label: "Honeymoon" },
  { href: "/offers", label: "Special Offers" },
] as const;

/** Extra links shown in the mobile menu and the footer, not already covered above. */
export const moreLinks = [
  { href: "/collections/events-festivals", label: "Events & Festivals" },
  { href: "/custom-trips", label: "Custom Trips" },
  { href: "/corporate", label: "Corporate & MICE" },
  { href: "/careers", label: "Careers" },
] as const;
