import type { Metadata } from "next";
import { Caveat, Poppins } from "next/font/google";
import "./globals.css";
import { getDestinations } from "@/lib/api";
import { site } from "@/lib/site";
import { LeadModalProvider } from "@/components/LeadModal";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppButton } from "@/components/WhatsAppButton";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Indian Rounds — Travel Beyond Borders",
    template: "%s | Indian Rounds",
  },
  description: "Handpicked destinations, seamless booking and unforgettable travel experiences with Indian Rounds.",
  openGraph: { siteName: "Indian Rounds", type: "website", locale: "en_IN" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const destinations = await getDestinations({ featured: "1" });

  return (
    <html lang="en" className={`${poppins.variable} ${caveat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LeadModalProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter destinations={destinations} />
          <WhatsAppButton />
        </LeadModalProvider>
      </body>
    </html>
  );
}
