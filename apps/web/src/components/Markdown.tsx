import type { ReactNode } from "react";
import { CoverImage } from "./CoverImage";

/**
 * Small, safe renderer for blog bodies: headings (##, ###), bullet and numbered lists, paragraphs, tip boxes
 * (lines starting with ">"), photos on their own line (![Caption](/photos/...)), **bold**, *italic* and
 * [links](https://…). Everything is rendered as React elements, so raw HTML in the source is shown as text and
 * never executed.
 */

const inline = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return null;
  }
})();

/** Photos on this site, https photos, and photos uploaded through the admin (served by the API). */
function safeImage(src: string): boolean {
  return /^(\/photos\/|https:\/\/)/.test(src) || (apiOrigin !== null && src.startsWith(`${apiOrigin}/api/v1/media/blog/`));
}

const imageLine = /^!\[([^\]]*)\]\((\S+)\)$/;

function safeHref(href: string): string | null {
  return /^(https?:\/\/|\/(?!\/)|mailto:)/i.test(href) ? href : null;
}

export function headingId(text: string): string {
  return text.toLowerCase().replace(/\*\*|\*/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The ## headings of a body, for a table of contents. */
export function headingsOf(source: string): { id: string; text: string }[] {
  return [...source.replace(/\r\n/g, "\n").matchAll(/^##\s+(.+)$/gm)].map((m) => ({ id: headingId(m[1]), text: m[1].replace(/\*\*|\*/g, "").trim() }));
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(inline).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]);
      if (href) {
        const external = /^https?:/i.test(href);
        return (
          <a key={key} href={href} className="font-medium text-brand-red underline decoration-brand-red/40 underline-offset-2 hover:decoration-brand-red" {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
            {link[1]}
          </a>
        );
      }
      return link[1];
    }
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  const out: ReactNode[] = [];

  const heading = (level: string, text: string, key: string) =>
    level === "##" ? <h2 key={key} id={headingId(text)}>{renderInline(text, key)}</h2> : <h3 key={key}>{renderInline(text, key)}</h3>;

  blocks.forEach((raw, i) => {
    const block = raw.trim();
    if (!block) return;
    const key = `b${i}`;
    const lines = block.split("\n");

    const img = lines.length === 1 ? imageLine.exec(block) : null;
    if (img && safeImage(img[2])) {
      out.push(
        <figure key={key} className="my-6">
          <CoverImage src={img[2]} alt={img[1]} seed={img[1] || key} className="aspect-[16/9] rounded-card" sizes="(min-width: 1024px) 720px, 100vw" />
          {img[1] && <figcaption className="mt-2 text-center text-xs text-muted">{img[1]}</figcaption>}
        </figure>,
      );
      return;
    }
    if (lines.every((l) => /^>\s?/.test(l))) {
      const text = lines.map((l) => l.replace(/^>\s?/, "")).join(" ");
      out.push(
        <aside key={key} role="note" className="my-5 rounded-r-card border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-[15px] text-ink/90">
          {renderInline(text, key)}
        </aside>,
      );
      return;
    }
    const head = /^(#{2,3})\s+(.+)$/.exec(lines[0]);
    if (head && lines.length === 1) {
      out.push(heading(head[1], head[2], key));
      return;
    }
    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      out.push(<ul key={key}>{lines.map((l, n) => <li key={n}>{renderInline(l.replace(/^[-*]\s+/, ""), `${key}-${n}`)}</li>)}</ul>);
      return;
    }
    if (lines.every((l) => /^\d+[.)]\s+/.test(l))) {
      out.push(<ol key={key}>{lines.map((l, n) => <li key={n}>{renderInline(l.replace(/^\d+[.)]\s+/, ""), `${key}-${n}`)}</li>)}</ol>);
      return;
    }
    // A heading directly followed by text in the same block.
    if (head) {
      out.push(heading(head[1], head[2], key));
      const rest = lines.slice(1).join(" ");
      if (rest.trim()) out.push(<p key={`${key}p`}>{renderInline(rest, `${key}p`)}</p>);
      return;
    }
    out.push(<p key={key}>{renderInline(lines.join(" "), key)}</p>);
  });

  return (
    <div className="space-y-4 text-[16.5px] leading-[1.75] text-ink/85 [&_h2]:mt-10 [&_h2]:scroll-mt-28 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:leading-tight [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_li]:pl-1 [&_li]:marker:text-brand-red">
      {out}
    </div>
  );
}
