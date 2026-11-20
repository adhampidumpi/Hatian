/**
 * Seeds the demo account with the sample data from docs/product-spec.md:
 * Siargao Trip plus the three other groups shown on Home.
 *
 * Run with `pnpm db:seed`. It wipes groups, expenses, payments and activity
 * first, so only point it at a development or demo database.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  type PaymentMethod,
} from "../src/generated/prisma/client";
import {
  diffJson,
  expenseSnapshot,
  paymentSnapshot,
  type ActivityDiff,
} from "../src/lib/activity";
import { categories } from "../src/lib/categories";
import { allocateShares, type SplitMode } from "../src/lib/money/split";
import { siargaoExpenses, siargaoMembers } from "./sample-data";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

type Person = { id: string; name: string; email: string | null };

const otherPeople: Person[] = [
  { id: "mika", name: "Mika", email: "mika@example.com" },
  // Placeholder: no account yet.
  { id: "jo", name: "Jo", email: null },
  { id: "paolo", name: "Paolo", email: "paolo@example.com" },
  { id: "rina", name: "Rina", email: "rina@example.com" },
];

const people: Person[] = [...siargaoMembers, ...otherPeople];
const person = (id: string) => people.find((p) => p.id === id)!;
/** The user id for a person with an account, or null for a placeholder. */
const userIdOf = (id: string) => (person(id).email ? id : null);

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
/** Activity timestamps: the given date at a plausible local time (UTC+8). */
const at = (iso: string, hour: number) =>
  new Date(`${iso}T${String(hour).padStart(2, "0")}:00:00+08:00`);

type SeededGroup = {
  id: string;
  currency: string;
  /** person id → GroupMember id */
  member: Record<string, string>;
};

async function logActivity(
  groupId: string,
  actorId: string,
  entityId: string | null,
  diff: ActivityDiff,
  createdAt: Date,
) {
  await db.activity.create({
    data: {
      groupId,
      actorId,
      type: diff.type,
      entityId,
      diff: diffJson(diff),
      createdAt,
    },
  });
}

async function createGroup(opts: {
  name: string;
  icon: string;
  personIds: string[];
  createdAt: string;
}): Promise<SeededGroup> {
  const group = await db.group.create({
    data: {
      name: opts.name,
      icon: opts.icon,
      currency: "PHP",
      createdById: "you",
      createdAt: at(opts.createdAt, 9),
    },
  });
  await logActivity(
    group.id,
    "you",
    null,
    { type: "GROUP_CREATED", after: { name: opts.name } },
    at(opts.createdAt, 9),
  );

  const member: Record<string, string> = {};
  for (const [colorIndex, personId] of opts.personIds.entries()) {
    const userId = userIdOf(personId);
    const created = await db.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        name: person(personId).name,
        role: personId === "you" ? "OWNER" : "MEMBER",
        colorIndex,
        joinedAt: userId ? at(opts.createdAt, 10) : null,
      },
    });
    member[personId] = created.id;
    if (personId === "you") continue;
    const snapshot = { memberId: created.id, name: created.name };
    await logActivity(
      group.id,
      userId ?? "you",
      created.id,
      userId
        ? { type: "MEMBER_JOINED", after: { ...snapshot, claimed: false } }
        : { type: "MEMBER_ADDED", after: snapshot },
      at(opts.createdAt, 10),
    );
  }
  return { id: group.id, currency: group.currency, member };
}

async function createExpense(
  group: SeededGroup,
  opts: {
    date: string;
    hour: number;
    description: string;
    categoryId: string;
    paidById: string;
    amount: number;
    mode: SplitMode;
    participants: string[];
  },
) {
  const split = allocateShares(
    opts.amount,
    group.currency,
    opts.mode,
    Object.entries(group.member).map(([personId, memberId]) => ({
      memberId,
      weight: opts.participants.includes(personId) ? 1 : 0,
    })),
  );
  if (!split.ok) throw new Error(`Bad split for ${opts.description}`);

  // Whoever paid added it, unless they have no account yet.
  const actorId = userIdOf(opts.paidById) ?? "you";
  const createdAt = at(opts.date, opts.hour);
  const expense = await db.expense.create({
    data: {
      groupId: group.id,
      description: opts.description,
      categoryId: opts.categoryId,
      date: day(opts.date),
      amount: opts.amount,
      currency: group.currency,
      paidById: group.member[opts.paidById]!,
      splitMode: opts.mode,
      createdById: actorId,
      createdAt,
      shares: {
        create: split.shares.map(({ memberId, weight, amount }) => ({
          memberId,
          weight,
          amount,
        })),
      },
    },
    include: { shares: true },
  });
  await logActivity(
    group.id,
    actorId,
    expense.id,
    { type: "EXPENSE_CREATED", after: expenseSnapshot(expense) },
    createdAt,
  );
}

async function createPayment(
  group: SeededGroup,
  opts: {
    fromId: string;
    toId: string;
    amount: number;
    method: PaymentMethod;
    date: string;
  },
) {
  const actorId = userIdOf(opts.fromId) ?? "you";
  const createdAt = at(opts.date, 18);
  const payment = await db.payment.create({
    data: {
      groupId: group.id,
      fromId: group.member[opts.fromId]!,
      toId: group.member[opts.toId]!,
      amount: opts.amount,
      currency: group.currency,
      method: opts.method,
      date: day(opts.date),
      createdById: actorId,
      createdAt,
    },
  });
  await logActivity(
    group.id,
    actorId,
    payment.id,
    { type: "PAYMENT_RECORDED", after: paymentSnapshot(payment) },
    createdAt,
  );
}

async function main() {
  await db.$transaction([
    db.activity.deleteMany(),
    db.payment.deleteMany(),
    db.expenseShare.deleteMany(),
    db.expense.deleteMany(),
    db.groupInvite.deleteMany(),
    db.groupMember.deleteMany(),
    db.group.deleteMany(),
  ]);

  for (const category of categories) {
    await db.category.upsert({
      where: { id: category.id },
      create: category,
      update: category,
    });
  }

  const accounts = people.filter((p) => p.email);
  // A sample email may already belong to a different user (say, someone
  // signed in as demo@hatian.app with a magic link before seeding). Remove
  // those so the upserts below can't hit the unique email constraint.
  await db.user.deleteMany({
    where: {
      email: { in: accounts.map((p) => p.email!) },
      id: { notIn: accounts.map((p) => p.id) },
    },
  });
  for (const user of accounts) {
    await db.user.upsert({
      where: { id: user.id },
      create: { ...user, emailVerified: new Date() },
      update: { name: user.name, email: user.email },
    });
  }

  // Siargao Trip: the main sample group. Dan hasn't joined yet.
  const siargao = await createGroup({
    name: "Siargao Trip",
    icon: "waves",
    personIds: siargaoMembers.map((m) => m.id),
    createdAt: "2026-11-10",
  });
  for (const [i, expense] of siargaoExpenses.entries()) {
    await createExpense(siargao, { ...expense, hour: 12 + i });
  }

  // Condo 4B: you owe Mika ₱2,450.00. Jo hasn't joined yet.
  const condoIds = ["you", "mika", "jo"];
  const condo = await createGroup({
    name: "Condo 4B",
    icon: "house",
    personIds: condoIds,
    createdAt: "2026-09-01",
  });
  await createExpense(condo, {
    date: "2026-11-05",
    hour: 20,
    description: "Meralco bill, October",
    categoryId: "utilities",
    paidById: "mika",
    amount: 735_000,
    mode: "EQUAL",
    participants: condoIds,
  });

  // Office lunch club: you're owed ₱380.00.
  const lunchIds = ["you", "paolo", "rina"];
  const lunch = await createGroup({
    name: "Office lunch club",
    icon: "utensils",
    personIds: lunchIds,
    createdAt: "2026-10-01",
  });
  await createExpense(lunch, {
    date: "2026-11-18",
    hour: 13,
    description: "Jollibee run",
    categoryId: "food",
    paidById: "you",
    amount: 57_000,
    mode: "EQUAL",
    participants: lunchIds,
  });

  // Baguio 2025: settled.
  const baguioIds = ["you", "ana", "bea"];
  const baguio = await createGroup({
    name: "Baguio 2025",
    icon: "mountain",
    personIds: baguioIds,
    createdAt: "2025-02-10",
  });
  await createExpense(baguio, {
    date: "2025-02-15",
    hour: 11,
    description: "Strawberry farm",
    categoryId: "activities",
    paidById: "ana",
    amount: 150_000,
    mode: "EQUAL",
    participants: baguioIds,
  });
  for (const fromId of ["you", "bea"]) {
    await createPayment(baguio, {
      fromId,
      toId: "ana",
      amount: 50_000,
      method: "GCASH",
      date: "2025-02-20",
    });
  }

  console.log("Seeded 4 groups for demo@hatian.app");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
