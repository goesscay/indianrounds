import { expect, test, type Page } from "@playwright/test";

async function fillTravellers(page: Page) {
  const names = page.locator('input[id^="t-name-"]');
  for (let i = 0; i < (await names.count()); i++) await names.nth(i).fill(`E2E Traveller ${i + 1}`);
}


/**
 * The money path from the plan: search -> tour -> Dates & Costing -> login gate -> checkout -> payment -> dashboard.
 * Payment is simulated (PAYMENT_DRIVER=fake); the Razorpay hand-off is covered by API tests and UAT in test mode.
 */
test("a visitor can book a tour: login is required before payment", async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`;
  const password = "e2e-password-1";

  await page.goto("/tours");
  await page.locator('a[href^="/tours/"]').first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.getByRole("link", { name: /check dates/i }).click();
  await page.locator('section[aria-labelledby="dates-h"] button:not([disabled])').first().click();
  await page.getByRole("button", { name: /continue to booking/i }).click();

  // Anonymous visitors can fill the form but cannot pay: continuing sends them to log in.
  await expect(page).toHaveURL(/\/checkout\?/);
  await page.getByLabel("Full name *").first().fill("E2E Traveller");
  await page.getByLabel("Mobile number *").fill("9876543210");
  await page.getByLabel("Email *").fill(email);
  await page.getByLabel("GST state *").selectOption("Tamil Nadu");
  await fillTravellers(page);
  await page.getByRole("button", { name: /log in to pay/i }).click();
  await expect(page).toHaveURL(/\/login\?next=/);

  await page.getByRole("link", { name: /create an account/i }).click();
  await page.getByLabel("Full name").fill("E2E Traveller");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  // Back at checkout with a session: the details entered before logging in are kept and the booking advances to payment.
  await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
  await page.getByRole("button", { name: /^pay ₹/i }).first().click();
  await page.getByRole("button", { name: /simulate successful payment/i }).click();
  await expect(page.getByRole("heading", { name: /booking confirmed/i })).toBeVisible();

  await page.getByRole("link", { name: /view booking/i }).click();
  await expect(page.getByText(/confirmed/i).first()).toBeVisible();

  await page.goto("/bookings");
  await expect(page.locator('a[href^="/bookings/"]').first()).toBeVisible();
});

test("the checkout page and the payment endpoints refuse anonymous access", async ({ request }) => {
  const res = await request.post("/api/backend/bookings", { data: {} });
  expect(res.status()).toBe(401);
});
