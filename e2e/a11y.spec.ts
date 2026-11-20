import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// WCAG 2.1 AA scan of every screen, at phone and desktop sizes.
// Runs against a seeded database (`pnpm db:seed`).

async function expectNoViolations(page: Page) {
  // Wait for streamed (Suspense) content before scanning.
  await page.waitForLoadState("networkidle");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.map((n) => n.target.join(" ")).slice(0, 5),
  }));
  expect(summary).toEqual([]);
}

test.describe("signed out", () => {
  for (const path of [
    "/login",
    "/login/check-email",
    "/login?error=Verification",
  ]) {
    test(`no accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try the demo account" }).click();
    await expect(page).toHaveURL("/");
  });

  for (const path of [
    "/",
    "/groups",
    "/activity",
    "/account",
    "/expenses/new",
  ]) {
    test(`no accessibility violations on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }

  test("no accessibility violations on a group page", async ({ page }) => {
    await page
      .getByRole("main")
      .getByRole("link", { name: /Siargao Trip/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "Siargao Trip" }),
    ).toBeVisible();
    await expectNoViolations(page);
  });
});
