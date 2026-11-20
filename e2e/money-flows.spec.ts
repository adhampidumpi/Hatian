import { expect, test } from "@playwright/test";
import {
  api,
  createUser,
  removeUsers,
  seedTodaysRate,
  signInAs,
  type TestUser,
} from "./helpers";

// Each test signs in fresh users, so the demo data stays untouched.
const users: TestUser[] = [];
test.afterAll(() => removeUsers(users));

async function newUser(name: string) {
  const user = await createUser(name);
  users.push(user);
  return user;
}

test("create a group, split an expense, record a payment", async ({
  page,
  context,
}) => {
  await signInAs(context, await newUser("Maria Test"));
  await page.goto("/groups");

  await page.getByRole("button", { name: "New group" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Beach trip");
  for (const friend of ["Bea", "Carlo"]) {
    await dialog.getByLabel("Friend's name").fill(friend);
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("heading", { name: "Beach trip" })).toBeVisible();

  await page.getByRole("link", { name: "Add expense" }).last().click();
  await page.getByLabel("Amount", { exact: true }).fill("900");
  await page.getByLabel("Description").fill("Dinner");
  await page.getByLabel("Include Carlo").uncheck();
  // The form's status line (the offline notice is a status region too).
  const formStatus = page.getByRole("status").filter({ hasText: "split" });
  await expect(formStatus).toHaveText("₱900.00 split 2 ways");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Expense added")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Dinner/ }).first(),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Balances", exact: true })
    .first()
    .click();
  const settle = page.locator("#settle-up");
  await expect(settle).toContainText("Bea pays you");
  await expect(settle).toContainText("₱450.00");

  await page.getByRole("button", { name: "Record another payment" }).click();
  const sheet = page.getByRole("dialog");
  await sheet
    .getByLabel("Who paid", { exact: true })
    .selectOption({ label: "Bea" });
  await sheet.getByLabel("Who was paid").selectOption({ label: "You" });
  await sheet.getByLabel("Amount").fill("200");
  await expect(sheet.getByText("Partial: ₱250.00 still owed")).toBeVisible();
  await sheet.getByRole("button", { name: /Record ₱200.00 via GCash/ }).click();

  await expect(settle).toContainText("₱250.00");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(settle).toContainText("₱450.00");
});

test("edit an expense, then delete it and undo", async ({ page, context }) => {
  await signInAs(context, await newUser("Maria Test"));
  await page.goto("/");
  const { id: groupId } = await api<{ id: string }>(page, "groups.create", {
    name: "Condo",
    icon: "house",
    currency: "PHP",
    memberNames: ["Jo"],
  });
  const group = await api<{
    me: { memberId: string };
    members: { id: string; name: string }[];
  }>(page, "groups.get", { groupId }, "query");
  const jo = group.members.find((m) => m.name === "Jo")!.id;
  await api(page, "expenses.create", {
    groupId,
    description: "Internet",
    categoryId: "utilities",
    date: "2026-11-01",
    amount: 199_900,
    paidById: group.me.memberId,
    splitMode: "EQUAL",
    weights: [
      { memberId: group.me.memberId, weight: 1 },
      { memberId: jo, weight: 1 },
    ],
  });

  await page.goto(`/groups/${groupId}`);
  await page
    .getByRole("link", { name: /Internet/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit expense" }),
  ).toBeVisible();
  await page.getByLabel("Amount", { exact: true }).fill("2100");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();

  await page
    .getByRole("link", { name: /Internet/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Delete expense" }).click();
  await expect(page.getByText("Deleted “Internet”")).toBeVisible();
  await expect(
    page.getByText("No expenses yet", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    page.getByRole("link", { name: /Internet/ }).first(),
  ).toBeVisible();

  await page
    .getByRole("link", { name: "Activity", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("edited “Internet”").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Amount ₱1,999.00 → ₱2,100.00").filter({ visible: true }),
  ).toBeVisible();
});

test("a friend joins with the invite link and claims their spot", async ({
  browser,
  page,
  context,
}) => {
  await signInAs(context, await newUser("Maria Test"));
  await page.goto("/");
  const { id: groupId } = await api<{ id: string }>(page, "groups.create", {
    name: "Siargao again",
    icon: "waves",
    currency: "PHP",
    memberNames: ["Dan"],
  });
  const group = await api<{
    me: { memberId: string };
    members: { id: string; name: string }[];
  }>(page, "groups.get", { groupId }, "query");
  const dan = group.members.find((m) => m.name === "Dan")!.id;
  await api(page, "expenses.create", {
    groupId,
    description: "Boat",
    categoryId: "activities",
    date: "2026-11-13",
    amount: 600_000,
    paidById: group.me.memberId,
    splitMode: "EQUAL",
    weights: [
      { memberId: group.me.memberId, weight: 1 },
      { memberId: dan, weight: 1 },
    ],
  });
  const { token } = await api<{ token: string }>(page, "invites.ensure", {
    groupId,
  });

  const danContext = await browser.newContext();
  await signInAs(danContext, await newUser("Dan Cruz"));
  const danPage = await danContext.newPage();
  await danPage.goto(`/invite/${token}`);
  await expect(
    danPage.getByRole("heading", { name: "Siargao again" }),
  ).toBeVisible();
  await danPage.getByText("I'm Dan").click();
  await danPage.getByRole("button", { name: "Join Siargao again" }).click();

  await expect(danPage).toHaveURL(new RegExp(`/groups/${groupId}$`));
  await expect(
    danPage.getByText("You owe in this group").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    danPage.getByText("₱3,000.00").filter({ visible: true }).first(),
  ).toBeVisible();
  await danContext.close();
});

test("an expense paid in another currency is converted", async ({
  page,
  context,
}) => {
  await seedTodaysRate("ZAR", "PHP", "3.5");
  await signInAs(context, await newUser("Maria Test"));
  await page.goto("/");
  const { id: groupId } = await api<{ id: string }>(page, "groups.create", {
    name: "Cape Town",
    icon: "plane",
    currency: "PHP",
    memberNames: ["Jo"],
  });

  await page.goto(`/groups/${groupId}/expenses/new`);
  await page.getByRole("button", { name: /Change currency/ }).click();
  await page.getByRole("radio", { name: /South African Rand/ }).click();
  await expect(
    page.getByRole("button", { name: /^ZAR, South African Rand/ }),
  ).toBeVisible();
  await page.getByLabel("Amount", { exact: true }).fill("1000");
  await page.getByLabel("Description").fill("Wine tour");
  await expect(page.getByText("≈ ₱3,500.00")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "split" }),
  ).toHaveText("ZAR 1,000.00 split 2 ways");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Expense added")).toBeVisible();
  // Stored in pesos; the original amount stays on the expense.
  await expect(
    page.getByText("You're owed in this group").filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("₱1,750.00").filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("ZAR 1,000.00").filter({ visible: true }).first(),
  ).toBeVisible();
});
