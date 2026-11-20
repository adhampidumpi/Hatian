import { expect, test, type Page } from "@playwright/test";

// Runs against a seeded database (`pnpm db:seed`).

async function signInAsDemo(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Try the demo account" }).click();
  await expect(page).toHaveURL("/");
}

test("buttons show a visible keyboard focus ring", async ({ page }) => {
  await page.goto("/login");
  const demo = page.getByRole("button", { name: "Try the demo account" });
  await expect(demo).toBeVisible();
  // Reach it from the keyboard so :focus-visible applies.
  await page.keyboard.press("Tab");
  for (let i = 0; i < 10; i++) {
    if (await demo.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(demo).toBeFocused();
  const outline = await demo.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline).toEqual({ style: "solid", width: "2px" });
});

test("signed-in visitors to /login are sent home", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/login");
  await expect(page).toHaveURL("/");
});

test("an unknown group shows the not-found page", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/groups/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to Home" }).click();
  await expect(page).toHaveURL("/");
});

test("signing out returns to the login page", async ({ page }) => {
  await signInAsDemo(page);
  await page.goto("/account");
  await expect(
    page.getByRole("main").getByText("demo@hatian.app"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("sign-in errors show a message instead of crashing", async ({ page }) => {
  await page.goto("/login?error=CredentialsSignin");
  // Scoped to main: Next's route announcer is also role="alert".
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "The demo account isn't available right now.",
  );
});
