import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Markdown, headingsOf } from "./Markdown";

const html = (src: string) => renderToStaticMarkup(<Markdown source={src} />);

describe("Markdown", () => {
  it("renders headings, paragraphs, lists and emphasis", () => {
    const out = html("## Title\n\nHello **bold** and *soft*.\n\n- one\n- two\n\n1. first\n2. second");
    expect(out).toContain('<h2 id="title">Title</h2>');
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>soft</em>");
    expect(out).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(out).toContain("<ol><li>first</li><li>second</li></ol>");
  });

  it("never emits raw HTML from the source", () => {
    const out = html('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;script&gt;");
  });

  it("drops the href of unsafe link schemes but keeps the text", () => {
    const out = html("[click](javascript:alert(1)) and [data](data:text/html,x) and [ok](https://example.com)");
    expect(out).not.toContain("javascript:");
    expect(out).not.toContain("data:text");
    expect(out).toContain("click");
    expect(out).toContain('href="https://example.com"');
  });

  it("marks external links noopener and nofollow, and allows relative links", () => {
    const out = html("[a](https://example.com) [b](/tours)");
    expect(out).toContain('rel="noopener noreferrer nofollow"');
    expect(out).toContain('href="/tours"');
  });

  it("rejects protocol-relative links", () => {
    expect(html("[x](//evil.example)")).not.toContain("evil.example");
  });

  it("handles a heading directly followed by text", () => {
    const out = html("## Heading\nBody text");
    expect(out).toContain('<h2 id="heading">Heading</h2>');
    expect(out).toContain("<p>Body text</p>");
  });

  it("copes with empty input and Windows line endings", () => {
    expect(html("")).not.toContain("<p>");
    expect(html("## A\r\n\r\nB")).toContain("<p>B</p>");
  });

  it("renders a photo on its own line as a captioned figure, and only for site photos or https", () => {
    const ok = html("![Fort Kochi fishing nets](/photos/places/kerala/fort-kochi-fishing-nets.jpg)");
    expect(ok).toContain("<figure");
    expect(ok).toContain("<figcaption");
    expect(ok).toContain("Fort Kochi fishing nets");
    expect(ok).toContain("/photos/places/kerala/fort-kochi-fishing-nets.jpg");

    const bad = html("![x](javascript:alert(1))");
    expect(bad).not.toContain("<figure");
    expect(bad).not.toContain("<img");
  });

  it("turns lines starting with > into a tip box", () => {
    const out = html("> **Tip:** Carry cash.");
    expect(out).toContain('role="note"');
    expect(out).toContain("<strong>Tip:</strong>");
  });

  it("lists the ## headings with the same ids the page uses", () => {
    const src = ["Intro", "## Kochi and Fort Kochi", "text", "### Not listed", "## Munnar: tea, hills & mist"].join(String.fromCharCode(10, 10));
    expect(headingsOf(src)).toEqual([
      { id: "kochi-and-fort-kochi", text: "Kochi and Fort Kochi" },
      { id: "munnar-tea-hills-mist", text: "Munnar: tea, hills & mist" },
    ]);
    expect(html(src)).toContain('id="munnar-tea-hills-mist"');
  });
});
