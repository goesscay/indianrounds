import type { ReactNode } from "react";

/**
 * Small, safe renderer for blog bodies: headings (##, ###), bullet and numbered lists,
 * paragraphs, **bold**, *italic* and [links](https://…). Everything is rendered as React
 * elements, so raw HTML in the source is shown as text and never executed.
 */

const inline = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)\s]+\))/g;

function safeHref(href: string): string | null {
  return /^(https?:\/\/|\/(?!\/)|mailto:)/i.test(href) ? href : null;
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
          <a key={key} href={href} className="text-brand-red underline" {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
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

  blocks.forEach((raw, i) => {
    const block = raw.trim();
    if (!block) return;
    const key = `b${i}`;
    const lines = block.split("\n");
    const heading = /^(#{2,3})\s+(.+)$/.exec(lines[0]);
    if (heading && lines.length === 1) {
      out.push(heading[1] === "##" ? <h2 key={key}>{renderInline(heading[2], key)}</h2> : <h3 key={key}>{renderInline(heading[2], key)}</h3>);
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
    if (heading) {
      out.push(heading[1] === "##" ? <h2 key={key}>{renderInline(heading[2], key)}</h2> : <h3 key={key}>{renderInline(heading[2], key)}</h3>);
      const rest = lines.slice(1).join(" ");
      if (rest.trim()) out.push(<p key={`${key}p`}>{renderInline(rest, `${key}p`)}</p>);
      return;
    }
    out.push(<p key={key}>{renderInline(lines.join(" "), key)}</p>);
  });

  return (
    <div className="space-y-4 text-[16px] leading-relaxed text-ink/85 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
      {out}
    </div>
  );
}
