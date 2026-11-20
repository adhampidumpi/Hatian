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
import { allocateShares, type SplitMode } from "../src/lib/money/split";
import {
  categories,
  siargaoExpenses,
  siargaoMembers,
} from "../src/lib/sample-data";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const otherPeople = [
  { id: "mika", name: "Mika", email: "mika@example.com" },
  { id: "jo", name: "Jo", email: "jo@example.com" },
  { id: "paolo", name: "Paolo", email: "paolo@example.com" },
  { id: "rina", name: "Rina", email: "rina@example.com" },
];

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
/** Activity timestamps: the expense date at a plausible local time (UTC+8). */
const at = (iso: string, hour: number) =>
  new Date(`${iso}T${String(hour).padStart(2, "0")}:00:00+08:00`);

async function createGroup(opts: {
  name: string;
  icon: string;
  memberIds: string[];
  createdAt: string;
}) {
  const group = await db.group.create({
    data: {
      name: opts.name,
      icon: opts.icon,
      currency: "PHP",
      createdById: "you",
      createdAt: at(opts.createdAt, 9),
      members: {
        create: opts.memberIds.map((userId) => ({
          userId,
          role: userId === "you" ? "OWNER" : "MEMBER",
          joinedAt: at(opts.createdAt, 9),
        })),
      },
    },
  });
  await db.activity.createMany({
    data: opts.memberIds
      .filter((id) => id !== "you")
      .map((actorId) => ({
        groupId: group.id,
        actorId,
        type: "MEMBER_JOINED" as const,
        createdAt: at(opts.createdAt, 10),
      })),
  });
  return group;
}

async function createExpense(opts: {
  groupId: string;
  memberIds: string[];
  date: string;
  hour: number;
  description: string;
  categoryId: string;
  paidById: string;
  amount: number;
  mode: SplitMode;
  participants: string[];
}) {
  const split = allocateShares(
    opts.amount,
    "PHP",
    opts.mode,
    opts.memberIds.map((userId) => ({
      userId,
      weight: opts.participants.includes(userId) ? 1 : 0,
    })),
  );
  if (!split.ok) throw new Error(`Bad split for ${opts.description}`);

  const createdAt = at(opts.date, opts.hour);
  const expense = await db.expense.create({
    data: {
      groupId: opts.groupId,
      description: opts.description,
      categoryId: opts.categoryId,
      date: day(opts.date),
      amount: opts.amount,
      currency: "PHP",
      paidById: opts.paidById,
      splitMode: opts.mode,
      createdById: opts.paidById,
      createdAt,
      shares: {
        create: split.shares.map(({ userId, weight, amount }) => ({
          userId,
          weight,
          amount,
        })),
      },
    },
  });
  await db.activity.create({
    data: {
      groupId: opts.groupId,
      actorId: opts.paidById,
      type: "EXPENSE_CREATED",
      entityId: expense.id,
      diff: { after: { description: opts.description, amount: opts.amount } },
      createdAt,
    },
  });
}

async function createPayment(opts: {
  groupId: string;
  fromId: string;
  toId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
}) {
  const createdAt = at(opts.date, 18);
  const payment = await db.payment.create({
    data: {
      groupId: opts.groupId,
      fromId: opts.fromId,
      toId: opts.toId,
      amount: opts.amount,
      currency: "PHP",
      method: opts.method,
      date: day(opts.date),
      createdById: opts.fromId,
      createdAt,
    },
  });
  await db.activity.create({
    data: {
      groupId: opts.groupId,
      actorId: opts.fromId,
      type: "PAYMENT_RECORDED",
      entityId: payment.id,
      diff: { after: { to: opts.toId, amount: opts.amount } },
      createdAt,
    },
  });
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

  for (const user of [...siargaoMembers, ...otherPeople]) {
    await db.user.upsert({
      where: { id: user.id },
      create: { ...user, emailVerified: new Date() },
      update: { name: user.name, email: user.email },
    });
  }

  // Siargao Trip: the main sample group.
  const siargaoIds = siargaoMembers.map((m) => m.id);
  const siargao = await createGroup({
    name: "Siargao Trip",
    icon: "waves",
    memberIds: siargaoIds,
    createdAt: "2026-11-10",
  });
  for (const [i, expense] of siargaoExpenses.entries()) {
    await createExpense({
      ...expense,
      groupId: siargao.id,
      memberIds: siargaoIds,
      hour: 12 + i,
    });
  }

  // Condo 4B: you owe Mika ₱2,450.00.
  const condoIds = ["you", "mika", "jo"];
  const condo = await createGroup({
    name: "Condo 4B",
    icon: "house",
    memberIds: condoIds,
    createdAt: "2026-09-01",
  });
  await createExpense({
    groupId: condo.id,
    memberIds: condoIds,
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
    memberIds: lunchIds,
    createdAt: "2026-10-01",
  });
  await createExpense({
    groupId: lunch.id,
    memberIds: lunchIds,
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
    memberIds: baguioIds,
    createdAt: "2025-02-10",
  });
  await createExpense({
    groupId: baguio.id,
    memberIds: baguioIds,
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
    await createPayment({
      groupId: baguio.id,
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
