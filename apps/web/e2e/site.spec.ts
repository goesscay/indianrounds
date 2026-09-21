import { expect, test } from "@playwright/test";

test.describe("security headers and proxy", () => {
  test("public pages send the hardening headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();

    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBeTruthy();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("https://checkout.razorpay.com");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("the proxy refuses cross-site writes and unknown paths", async ({ request }) => {
    const cross = await request.post("/api/backend/auth/login", { headers: { Origin: "https://evil.example" }, data: { email: "a@b.co", password: "x" } });
    expect(cross.status()).toBe(403);

    const unknown = await request.get("/api/backend/health");
    expect(unknown.status()).toBe(404);
  });

  test("the auth token is never readable by page scripts", async ({ page, request }) => {
    const email = `cookie+${Date.now()}@example.com`;
    const res = await request.post("/api/backend/auth/register", {
      data: { name: "Cookie Test", email, phone: "9876543210", password: "cookie-pass-123", password_confirmation: "cookie-pass-123" },
    });
    expect(res.status()).toBe(201);
    expect(JSON.stringify(await res.json())).not.toContain('"token"');

    await page.context().addCookies((await request.storageState()).cookies);
    await page.goto("/");
    expect(await page.evaluate(() => document.cookie)).not.toContain("ir_token");
  });

  test("the back office is not available to visitors", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("redirects and SEO", () => {
  test("old URLs redirect permanently", async ({ request }) => {
    const res = await request.get("/about-us", { maxRedirects: 0 });
    expect(res.status()).toBe(308);
    expect(res.headers()["location"]).toContain("/about");
  });

  test("robots.txt hides private areas and sitemap lists content", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /checkout");
    expect(robots).toContain("Sitemap:");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/blog");
    expect(sitemap).toContain("/tours/");
  });

  test("key pages have a title, description and canonical", async ({ page }) => {
    for (const path of ["/", "/tours", "/blog", "/corporate"]) {
      await page.goto(path);
      await expect(page).toHaveTitle(/Indian Rounds/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{20,}/);
    }
    await page.goto("/blog");
    await page.locator('a[href^="/blog/"]').first().click();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld!)["@type"]).toBe("Article");
  });

  test("an unknown page returns a real 404", async ({ request }) => {
    expect((await request.get("/definitely-not-a-page")).status()).toBe(404);
  });
});

test.describe("responsive layout", () => {
  for (const width of [375, 768, 1280]) {
    test(`home, tour and blog pages do not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/tours");
      const tour = await page.locator('a[href^="/tours/"]').first().getAttribute("href");

      for (const path of ["/", tour!, "/blog", "/corporate", "/checkout"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
      }
    });
  }
});
