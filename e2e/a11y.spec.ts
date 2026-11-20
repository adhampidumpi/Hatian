import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// WCAG 2.1 AA scan of every screen, at phone and desktop sizes, in light
// and dark mode (the app follows the system setting by default).
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

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

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
        await page
          .getByRole("button", { name: "Try the demo account" })
          .click();
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

      test("no accessibility violations on every group screen", async ({
        page,
      }) => {
        await page
          .getByRole("main")
          .getByRole("link", { name: /Siargao Trip/ })
          .click();
        await expect(
          page.getByRole("heading", { name: "Siargao Trip" }),
        ).toBeVisible();
        const base = new URL(page.url()).pathname;

        for (const path of [
          "",
          "/balances",
          "/activity",
          "/settings",
          "/expenses/new",
        ]) {
          await test.step(path || "/expenses", async () => {
            await page.goto(base + path);
            await expectNoViolations(page);
          });
        }

        await test.step("edit expense", async () => {
          await page.goto(base);
          await page
            .getByRole("link", { name: /Dinner at Kermit/ })
            .first()
            .click();
          await expect(
            page.getByRole("heading", { name: "Edit expense" }),
          ).toBeVisible();
          await expectNoViolations(page);
        });

        await test.step("record payment sheet", async () => {
          await page.goto(`${base}/balances`);
          await page.getByRole("button", { name: "Record" }).first().click();
          await expect(page.getByRole("dialog")).toBeVisible();
          await expectNoViolations(page);
        });
      });
    });

    test("no accessibility violations on an invite link", async ({
      page,
      browser,
    }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: "Try the demo account" }).click();
      await expect(page).toHaveURL("/");
      const groups = await (
        await page.request.get("/api/trpc/groups.list")
      ).json();
      const siargao = groups.result.data.json.find(
        (g: { name: string }) => g.name === "Siargao Trip",
      );
      const ensure = await page.request.post("/api/trpc/invites.ensure", {
        data: { json: { groupId: siargao.id } },
      });
      const { token } = (await ensure.json()).result.data.json;

      const visitor = await browser.newContext();
      const visitorPage = await visitor.newPage();
      await visitorPage.goto(`/invite/${token}`);
      await expect(visitorPage.getByText("Sign in to join")).toBeVisible();
      await expectNoViolations(visitorPage);
      await visitor.close();
    });
  });
}
