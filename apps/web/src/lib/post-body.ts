/**
 * The article body is stored as light Markdown (see components/Markdown.tsx). The admin edits it as an ordered
 * list of fields instead of one big text box: section headings, text, photos and tip boxes. These helpers
 * convert between the two so nothing about the stored format, the public page or old articles changes.
 */

export type BodyBlock =
  | { id: string; type: "h2" | "h3"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "tip"; text: string }
  | { id: string; type: "photo"; url: string; caption: string };

export type BodyBlockType = BodyBlock["type"];

let counter = 0;
export function newId(): string {
  counter += 1;
  return `blk-${Date.now().toString(36)}-${counter}`;
}

const imageLine = /^!\[([^\]]*)\]\((\S+)\)$/;

/** Splits stored Markdown into editable blocks, the same way the public page reads it. */
export function parseBody(source: string): BodyBlock[] {
  const out: BodyBlock[] = [];
  for (const raw of source.replace(/\r\n/g, "\n").trim().split(/\n{2,}/)) {
    const block = raw.trim();
    if (!block) continue;
    const lines = block.split("\n");

    const img = lines.length === 1 ? imageLine.exec(block) : null;
    if (img) {
      out.push({ id: newId(), type: "photo", url: img[2], caption: img[1] });
      continue;
    }
    if (lines.every((l) => /^>\s?/.test(l))) {
      out.push({ id: newId(), type: "tip", text: lines.map((l) => l.replace(/^>\s?/, "")).join(" ") });
      continue;
    }
    const head = /^(#{2,3})\s+(.+)$/.exec(lines[0]);
    if (head) {
      out.push({ id: newId(), type: head[1] === "##" ? "h2" : "h3", text: head[2].trim() });
      const rest = lines.slice(1).join("\n").trim();
      if (rest) out.push({ id: newId(), type: "text", text: rest });
      continue;
    }
    out.push({ id: newId(), type: "text", text: block });
  }
  return out;
}

const oneLine = (s: string) => s.replace(/\s*\n+\s*/g, " ").trim();

/** Writes blocks back as Markdown. Empty blocks are skipped. */
export function serializeBody(blocks: BodyBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "h2" || b.type === "h3") {
      const t = oneLine(b.text);
      if (t) parts.push(`${b.type === "h2" ? "##" : "###"} ${t}`);
    } else if (b.type === "text") {
      const t = b.text.replace(/\r\n/g, "\n").trim();
      if (t) parts.push(t);
    } else if (b.type === "tip") {
      const t = oneLine(b.text);
      if (t) parts.push(`> ${t}`);
    } else if (b.type === "photo" && b.url.trim()) {
      const caption = b.caption.replace(/[[\]\n]/g, " ").trim();
      parts.push(`![${caption}](${b.url.trim().replace(/\s/g, "%20")})`);
    }
  }
  return parts.join("\n\n");
}

export type FactRow = { id: string; label: string; value: string };

export function factsToRows(facts: { label: string; value: string }[] | null | undefined): FactRow[] {
  return (facts ?? []).map((f) => ({ id: newId(), label: f.label, value: f.value }));
}

/** Rows with both a label and a value, ready to send. */
export function rowsToFacts(rows: FactRow[]): { label: string; value: string }[] {
  return rows.map((r) => ({ label: r.label.trim(), value: r.value.trim() })).filter((r) => r.label && r.value);
}

export const MAX_FACTS = 8;
