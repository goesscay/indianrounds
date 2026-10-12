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

/** Where each region lives: the two top-level places to browse destinations. */
export const regionLinks = {
  international: { href: "/explore-the-world", label: "Explore the World" },
  india: { href: "/explore-india", label: "Explore India" },
} as const;

/** Top bar (white): compact utility links. The logo itself is the "Home" link. */
export const topNavLinks = [
  { href: "/bookings", label: "My Bookings" },
  { href: "/blog", label: "Travel Stories" },
  { href: "/about", label: "About Us" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
] as const;

/** Second bar (brand red): the main catalogue/category navigation. */
export const categoryNavLinks = [
  { href: "/explore-the-world", label: "Explore the World" },
  { href: "/explore-india", label: "Explore India" },
  { href: "/group-tours", label: "Group Tours" },
  { href: "/weekend-escapes", label: "Weekend Escapes" },
  { href: "/honeymoon", label: "Honeymoon" },
  { href: "/offers", label: "Special Offers" },
] as const;

/** Extra links shown in the mobile menu and the footer, not already covered above. */
export const moreLinks = [
  { href: "/custom-trips", label: "Custom Trips" },
] as const;
