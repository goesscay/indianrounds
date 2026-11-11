import { describe, expect, it } from "vitest";
import { factsToRows, parseBody, rowsToFacts, serializeBody } from "./post-body";

const sample = [
  "Five days is enough for one hill station.",
  "## How to shape the days",
  "1. Day one in Kochi\n2. Day two to Munnar",
  "![Alleppey houseboat](https://indianrounds.in/photos/places/kerala/alleppey-houseboat.jpg)",
  "> **Tip:** Book the houseboat early.",
  "### Getting around",
  "- Taxi\n- Train",
].join("\n\n");

describe("post body fields", () => {
  it("turns Markdown into fields and back without losing anything", () => {
    const blocks = parseBody(sample);
    expect(blocks.map((b) => b.type)).toEqual(["text", "h2", "text", "photo", "tip", "h3", "text"]);
    expect(serializeBody(blocks)).toBe(sample);
  });

  it("reads photo captions and addresses", () => {
    const photo = parseBody("![A caption](/photos/x.jpg)")[0];
    expect(photo).toMatchObject({ type: "photo", caption: "A caption", url: "/photos/x.jpg" });
  });

  it("splits a heading that is directly followed by text", () => {
    expect(parseBody("## Munnar\nTea hills and mist.").map((b) => b.type)).toEqual(["h2", "text"]);
  });

  it("skips empty fields and cleans up captions", () => {
    const blocks = parseBody("## A\n\nText");
    blocks.push({ id: "x", type: "text", text: "   " }, { id: "y", type: "photo", url: "", caption: "none" }, { id: "z", type: "photo", url: "/photos/a b.jpg", caption: "Bad [caption]\nhere" });
    expect(serializeBody(blocks)).toBe("## A\n\nText\n\n![Bad  caption  here](/photos/a%20b.jpg)");
  });

  it("keeps headings on one line and tips as a single quote", () => {
    expect(serializeBody([{ id: "a", type: "h2", text: "Two\nlines" }, { id: "b", type: "tip", text: "Tip\nmore" }])).toBe("## Two lines\n\n> Tip more");
  });

  it("handles empty text and Windows line endings", () => {
    expect(parseBody("")).toEqual([]);
    expect(parseBody("## A\r\n\r\nText").map((b) => b.type)).toEqual(["h2", "text"]);
  });
});

describe("quick facts rows", () => {
  it("drops half-filled rows and trims", () => {
    const rows = factsToRows([{ label: "Best time", value: "Oct to Mar" }]);
    rows.push({ id: "n", label: "  Stay ", value: " 5 nights " }, { id: "e", label: "Only label", value: "" });
    expect(rowsToFacts(rows)).toEqual([{ label: "Best time", value: "Oct to Mar" }, { label: "Stay", value: "5 nights" }]);
  });
});
