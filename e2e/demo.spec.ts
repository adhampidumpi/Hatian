import { expect, test } from "@playwright/test";

test("the demo is a private copy where a friend adds an expense live", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Try the demo account" }).click();
  await expect(page).toHaveURL("/");

  await page
    .getByRole("main")
    .getByRole("link", { name: /Siargao Trip/ })
    .click();
  await expect(page.getByText("Your private demo")).toBeVisible();

  await page.getByRole("button", { name: "Watch Bea add an expense" }).click();
  await expect(page.getByText("is adding an expense")).toBeVisible();
  await expect(
    page
      .getByText(
        /Halo-halo for everyone|Habal-habal rides|Surfboard rental|Island hopping snacks/,
      )
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("is adding an expense")).toBeHidden();

  await page.goto("/account");
  await expect(
    page.getByRole("main").getByText(/Private demo, deleted in/),
  ).toBeVisible();
});
