import Image from "next/image";

const palettes = [
  ["#0f4c81", "#5aa9e6"],
  ["#b3261e", "#f28b82"],
  ["#0b6e4f", "#7bd3a8"],
  ["#5b3a8c", "#b39ddb"],
  ["#c25b00", "#ffb74d"],
  ["#00629b", "#4dd0e1"],
];

function pick(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

/** Photo when `src` is set, otherwise a deterministic gradient placeholder. */
const optimisedHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);

/** Only hosts we have allow-listed go through the Next.js optimiser (resizing, AVIF/WebP); other URLs are shown as-is. */
function canOptimise(src: string) {
  try {
    return optimisedHosts.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

export function CoverImage({ src, alt, seed, className = "", sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" }: { src?: string | null; alt: string; seed: string; className?: string; sizes?: string }) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={src} alt={alt} fill sizes={sizes} unoptimized={!canOptimise(src)} className="object-cover" />
      </div>
    );
  }
  const [a, b] = pick(seed);
  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden ${className}`}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-1/2 w-full opacity-30" aria-hidden>
        <path d="M0 100 L0 70 L40 30 L70 60 L110 15 L150 55 L180 35 L200 60 L200 100 Z" fill="white" />
      </svg>
    </div>
  );
}
