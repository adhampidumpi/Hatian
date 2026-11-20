import { expect, test } from "@playwright/test";

// Runs against a seeded database (`pnpm db:seed`).

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: "Try the demo account" }),
  ).toBeVisible();
});

test.describe("demo account", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Try the demo account" }).click();
    await expect(page).toHaveURL("/");
  });

  test("Home shows the overall balance from the sample data", async ({
    page,
  }) => {
    const card = page.getByRole("region", { name: "Overall balance" });
    await expect(card).toContainText("Overall, you're owed");
    await expect(card).toContainText("₱11,683.00");
    await expect(card).toContainText("₱14,133.00");
    await expect(card).toContainText("₱2,450.00");

    // The sidebar also has a "Groups" section on desktop.
    const groups = page
      .getByRole("main")
      .getByRole("region", { name: "Groups" });
    await expect(
      groups.getByRole("link", { name: /Siargao Trip/ }),
    ).toContainText("₱13,753.00");
    await expect(
      groups.getByRole("link", { name: /Baguio 2025/ }),
    ).toContainText("settled up");
  });

  test("navigation matches the screen size", async ({ page, isMobile }) => {
    const tabs = page.getByRole("navigation", { name: "Primary" });
    if (isMobile) {
      await expect(
        page.getByRole("complementary", { name: "Sidebar" }),
      ).toBeHidden();
      await expect(
        tabs.getByRole("link", { name: "Add expense" }),
      ).toBeVisible();
      await tabs.getByRole("link", { name: "Activity" }).click();
    } else {
      const sidebar = page.getByRole("complementary", { name: "Sidebar" });
      await expect(sidebar).toBeVisible();
      await expect(
        sidebar.getByRole("link", { name: /Condo 4B/ }),
      ).toContainText("2,450");
      await sidebar.getByRole("link", { name: "Activity" }).click();
    }
    await expect(page).toHaveURL("/activity");
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  });

  test("N opens Add expense on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard shortcut is desktop only");
    await page.keyboard.press("n");
    await expect(page).toHaveURL("/expenses/new");
  });
});
