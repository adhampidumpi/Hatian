import { expect, test, type Browser } from "@playwright/test";
import {
  api,
  createUser,
  removeUsers,
  signInAs,
  type TestUser,
} from "./helpers";

// Two people in one group, each in their own browser.
const users: TestUser[] = [];
test.afterAll(() => removeUsers(users));

async function twoPeopleInAGroup(browser: Browser) {
  const [ana, bea] = await Promise.all([
    createUser("Ana Live"),
    createUser("Bea Live"),
  ]);
  users.push(ana, bea);
  const [anaContext, beaContext] = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  await signInAs(anaContext, ana);
  await signInAs(beaContext, bea);
  const [anaPage, beaPage] = await Promise.all([
    anaContext.newPage(),
    beaContext.newPage(),
  ]);

  await anaPage.goto("/");
  const { id: groupId } = await api<{ id: string }>(anaPage, "groups.create", {
    name: "Live trip",
    icon: "waves",
    currency: "PHP",
    memberNames: [],
  });
  const { token } = await api<{ token: string }>(anaPage, "invites.ensure", {
    groupId,
  });
  await beaPage.goto("/");
  await api(beaPage, "invites.join", { token });

  return {
    groupId,
    anaPage,
    beaPage,
    close: () => Promise.all([anaContext.close(), beaContext.close()]),
  };
}

test("an expense one person adds shows up for the other without a reload", async ({
  browser,
}) => {
  const { groupId, anaPage, beaPage, close } = await twoPeopleInAGroup(browser);
  await anaPage.goto("/activity");
  await expect(anaPage.getByText("Live", { exact: true })).toBeVisible();

  const bea = await api<{ me: { memberId: string } }>(
    beaPage,
    "groups.get",
    { groupId },
    "query",
  );
  await api(beaPage, "expenses.create", {
    groupId,
    description: "Island snacks",
    categoryId: "food",
    date: "2026-11-14",
    amount: 50_000,
    paidById: bea.me.memberId,
    splitMode: "EQUAL",
    weights: [{ memberId: bea.me.memberId, weight: 1 }],
  });

  await expect(anaPage.getByText("Island snacks")).toBeVisible();
  await close();
});

test("others see who is adding an expense, until they stop", async ({
  browser,
}) => {
  const { groupId, anaPage, beaPage, close } = await twoPeopleInAGroup(browser);
  await anaPage.goto(`/groups/${groupId}`);
  await expect(
    anaPage.getByRole("heading", { name: "Live trip" }),
  ).toBeVisible();

  await beaPage.goto(`/groups/${groupId}/expenses/new`);
  // Sent on open and every 8 seconds, so this holds even if Ana's live
  // connection was still opening when the first one went out.
  const line = anaPage.getByText("is adding an expense");
  await expect(line).toBeVisible({ timeout: 15_000 });
  await expect(
    anaPage.getByRole("status").filter({ hasText: "Bea Live" }),
  ).toBeVisible();

  await beaPage.getByRole("link", { name: "Close" }).click();
  await expect(line).toBeHidden({ timeout: 15_000 });
  await close();
});
