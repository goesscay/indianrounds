/**
 * Permanent (308) redirects for URLs that may already be bookmarked, printed or indexed.
 * Add the client's old-site paths here before launch (see docs/launch-checklist.md, "Redirects"):
 * the source can use Next.js path patterns such as "/old-tours/:slug".
 *
 * The first block covers the common alternate spellings of our own pages.
 */
export const legacyRedirects: [source: string, destination: string][] = [
  ["/about-us", "/about"],
  ["/contact-us", "/contact"],
  ["/blogs", "/blog"],
  ["/blogs/:slug", "/blog/:slug"],
  ["/career", "/careers"],
  ["/tour-packages", "/tours"],
  ["/tour-packages/:slug", "/tours/:slug"],
  ["/packages", "/tours"],
  ["/packages/:slug", "/tours/:slug"],
  ["/corporate-travel", "/corporate"],
  ["/mice", "/corporate"],
  ["/weekend-getaways", "/collections/weekend-getaways"],
  ["/events-festivals", "/collections/events-festivals"],
  ["/privacy-policy", "/privacy"],
  ["/terms-and-conditions", "/terms"],
  ["/terms-conditions", "/terms"],
];
