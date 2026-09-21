// Placeholder business details taken from the design mockup.
// Replace with real values (see development plan, section 8) before launch.
export const site = {
  name: "Indian Rounds",
  tagline: "Travel Beyond Borders",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  phone: "+91 98765 43210",
  phoneHref: "tel:+919876543210",
  whatsapp: "919876543210",
  email: "info@indianrounds.com",
  address: "123, Travel Street, Chennai, Tamil Nadu, India",
  hours: "Mon - Sat: 9:00 AM - 7:00 PM",
  socials: [
    { label: "Facebook", href: "https://facebook.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Tours" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

/** Secondary navigation: under "More" in the header, and in the mobile menu and footer. */
export const moreLinks = [
  { href: "/collections/weekend-getaways", label: "Weekend Getaways" },
  { href: "/collections/events-festivals", label: "Events & Festivals" },
  { href: "/custom-trips", label: "Custom Trips" },
  { href: "/corporate", label: "Corporate & MICE" },
  { href: "/blog", label: "Blog" },
  { href: "/careers", label: "Careers" },
] as const;
