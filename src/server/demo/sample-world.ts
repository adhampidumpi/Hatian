/**
 * The sample world from docs/product-spec.md, seen by "you" (Maria Santos):
 * Siargao Trip plus the three other groups on Home. `pnpm db:seed` builds
 * it once for demo@hatian.app; "Try the demo" builds a private copy per
 * visitor. No "server-only" import: the seed script runs this in plain Node.
 */
import type { PaymentMethod, Prisma } from "@/generated/prisma/client";
import {
  diffJson,
  expenseSnapshot,
  paymentSnapshot,
  type ActivityDiff,
} from "@/lib/activity";
import { allocateShares, type SplitMode } from "@/lib/money/split";
import { siargaoExpenses, siargaoMembers } from "./sample-data";

type Db = Prisma.TransactionClient;

export type SamplePerson = { id: string; name: string; email: string | null };

export const samplePeople: SamplePerson[] = [
  ...siargaoMembers,
  { id: "mika", name: "Mika", email: "mika@example.com" },
  // Placeholder: no account yet.
  { id: "jo", name: "Jo", email: null },
  { id: "paolo", name: "Paolo", email: "paolo@example.com" },
  { id: "rina", name: "Rina", email: "rina@example.com" },
];

/** The sample people who have accounts (everyone else is a placeholder). */
export const sampleAccounts = samplePeople.filter((p) => p.email !== null);

/** Person id → User id, for each of `sampleAccounts`. */
export type SampleCast = Record<string, string>;

const DAY_MS = 24 * 60 * 60 * 1000;
/** The day after the newest sample date: "today" in the sample data. */
const SAMPLE_TODAY = Date.parse("2026-11-19T00:00:00Z");

type SeededGroup = {
  id: string;
  currency: string;
  /** person id → GroupMember id */
  member: Record<string, string>;
};

/**
 * Create the four sample groups with their expenses, payments and history.
 * Dates move with `now`, so the newest sample day is always yesterday and
 * the demo never looks stale.
 */
export async function createSampleWorld(
  db: Db,
  cast: SampleCast,
  now = new Date(),
) {
  const shift = Math.round((now.getTime() - SAMPLE_TODAY) / DAY_MS) * DAY_MS;
  const day = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + shift);
  // The given date at a plausible local time (UTC+8).
  const at = (iso: string, hour: number) =>
    new Date(
      Date.parse(`${iso}T${String(hour).padStart(2, "0")}:00:00+08:00`) + shift,
    );
  const userIdOf = (personId: string) => cast[personId] ?? null;
  const nameOf = (personId: string) =>
    samplePeople.find((p) => p.id === personId)!.name;
  const you = cast.you!;

  // History is written in one batch at the end: fewer round trips, so a
  // visitor's demo starts quickly.
  const history: Prisma.ActivityCreateManyInput[] = [];
  function log(
    groupId: string,
    actorId: string,
    entityId: string | null,
    diff: ActivityDiff,
    createdAt: Date,
  ) {
    history.push({
      groupId,
      actorId,
      type: diff.type,
      entityId,
      diff: diffJson(diff),
      createdAt,
    });
  }

  async function group(opts: {
    name: string;
    icon: string;
    personIds: string[];
    createdAt: string;
  }): Promise<SeededGroup> {
    const created = await db.group.create({
      data: {
        name: opts.name,
        icon: opts.icon,
        currency: "PHP",
        createdById: you,
        createdAt: at(opts.createdAt, 9),
        members: {
          create: opts.personIds.map((personId, colorIndex) => ({
            userId: userIdOf(personId),
            name: nameOf(personId),
            role: personId === "you" ? ("OWNER" as const) : ("MEMBER" as const),
            colorIndex,
            joinedAt: userIdOf(personId) ? at(opts.createdAt, 10) : null,
          })),
        },
      },
      include: { members: { orderBy: { colorIndex: "asc" } } },
    });
    log(
      created.id,
      you,
      null,
      { type: "GROUP_CREATED", after: { name: opts.name } },
      at(opts.createdAt, 9),
    );

    const member: Record<string, string> = {};
    for (const [index, personId] of opts.personIds.entries()) {
      const m = created.members[index]!;
      member[personId] = m.id;
      if (personId === "you") continue;
      const userId = userIdOf(personId);
      const snapshot = { memberId: m.id, name: m.name };
      log(
        created.id,
        userId ?? you,
        m.id,
        userId
          ? { type: "MEMBER_JOINED", after: { ...snapshot, claimed: false } }
          : { type: "MEMBER_ADDED", after: snapshot },
        at(opts.createdAt, 10),
      );
    }
    return { id: created.id, currency: created.currency, member };
  }

  async function expense(
    g: SeededGroup,
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
      g.currency,
      opts.mode,
      Object.entries(g.member).map(([personId, memberId]) => ({
        memberId,
        weight: opts.participants.includes(personId) ? 1 : 0,
      })),
    );
    if (!split.ok) throw new Error(`Bad split for ${opts.description}`);

    // Whoever paid added it, unless they have no account yet.
    const actorId = userIdOf(opts.paidById) ?? you;
    const createdAt = at(opts.date, opts.hour);
    const created = await db.expense.create({
      data: {
        groupId: g.id,
        description: opts.description,
        categoryId: opts.categoryId,
        date: day(opts.date),
        amount: opts.amount,
        currency: g.currency,
        paidById: g.member[opts.paidById]!,
        splitMode: opts.mode,
        createdById: actorId,
        createdAt,
        shares: { create: split.shares },
      },
      include: { shares: true },
    });
    log(
      g.id,
      actorId,
      created.id,
      { type: "EXPENSE_CREATED", after: expenseSnapshot(created) },
      createdAt,
    );
  }

  async function payment(
    g: SeededGroup,
    opts: {
      fromId: string;
      toId: string;
      amount: number;
      method: PaymentMethod;
      date: string;
    },
  ) {
    const actorId = userIdOf(opts.fromId) ?? you;
    const createdAt = at(opts.date, 18);
    const created = await db.payment.create({
      data: {
        groupId: g.id,
        fromId: g.member[opts.fromId]!,
        toId: g.member[opts.toId]!,
        amount: opts.amount,
        currency: g.currency,
        method: opts.method,
        date: day(opts.date),
        createdById: actorId,
        createdAt,
      },
    });
    log(
      g.id,
      actorId,
      created.id,
      { type: "PAYMENT_RECORDED", after: paymentSnapshot(created) },
      createdAt,
    );
  }

  // Siargao Trip: the main sample group. Dan hasn't joined yet.
  const siargao = await group({
    name: "Siargao Trip",
    icon: "waves",
    personIds: siargaoMembers.map((m) => m.id),
    createdAt: "2026-11-10",
  });
  for (const [i, e] of siargaoExpenses.entries()) {
    await expense(siargao, { ...e, hour: 12 + i });
  }

  // Condo 4B: you owe Mika ₱2,450.00. Jo hasn't joined yet.
  const condoIds = ["you", "mika", "jo"];
  const condo = await group({
    name: "Condo 4B",
    icon: "house",
    personIds: condoIds,
    createdAt: "2026-09-01",
  });
  await expense(condo, {
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
  const lunch = await group({
    name: "Office lunch club",
    icon: "utensils",
    personIds: lunchIds,
    createdAt: "2026-10-01",
  });
  await expense(lunch, {
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
  const baguio = await group({
    name: "Baguio 2025",
    icon: "mountain",
    personIds: baguioIds,
    createdAt: "2025-02-10",
  });
  await expense(baguio, {
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
    await payment(baguio, {
      fromId,
      toId: "ana",
      amount: 50_000,
      method: "GCASH",
      date: "2025-02-20",
    });
  }

  await db.activity.createMany({ data: history });
}
