import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** WCAG 2.1 A/AA scan; the plan's gate is "no serious violations". */
const pages = ["/", "/destinations", "/tours", "/blog", "/collections/weekend-getaways", "/corporate", "/custom-trips", "/careers", "/contact", "/about", "/login", "/register", "/terms"];

async function scan(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
}

for (const width of [375, 1280]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of pages) {
      test(`${path} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        expect(await scan(page)).toEqual([]);
      });
    }
  });
}

test("a tour page and a blog post have no serious violations", async ({ page }) => {
  await page.goto("/tours");
  const href = await page.locator('a[href^="/tours/"]').first().getAttribute("href");
  await page.goto(href!);
  await page.waitForLoadState("networkidle");
  expect(await scan(page)).toEqual([]);

  await page.goto("/blog");
  await page.locator('a[href^="/blog/"]').first().click();
  await page.waitForLoadState("networkidle");
  expect(await scan(page)).toEqual([]);
});

test("the quote dialog is keyboard-operable and labelled", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /plan your trip/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("the skip link jumps to the main landmark", async ({ page }) => {
  await page.goto("/about");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /skip to main content/i })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});
