/**
 * Seeds demo@hatian.app with the sample world (src/server/demo): Siargao
 * Trip plus the three other groups shown on Home. "Try the demo" doesn't
 * need this (each visitor gets a private copy); it's for local development.
 *
 * Run with `pnpm db:seed`. It wipes groups, expenses, payments and activity
 * first, so only point it at a development database.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  createSampleWorld,
  sampleAccounts,
} from "../src/server/demo/sample-world";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  await db.$transaction([
    db.activity.deleteMany(),
    db.payment.deleteMany(),
    db.expenseShare.deleteMany(),
    db.expense.deleteMany(),
    db.groupInvite.deleteMany(),
    db.groupMember.deleteMany(),
    db.group.deleteMany(),
    // Demo copies lost their groups above; remove their people too.
    db.user.deleteMany({ where: { demoExpiresAt: { not: null } } }),
  ]);

  // Fixed ids ("you", "ana", …) so the sample accounts are stable. A sample
  // email may already belong to someone else (say, a magic-link sign-in as
  // demo@hatian.app before seeding): remove those so the upserts can't clash.
  await db.user.deleteMany({
    where: {
      email: { in: sampleAccounts.map((p) => p.email!) },
      id: { notIn: sampleAccounts.map((p) => p.id) },
    },
  });
  for (const user of sampleAccounts) {
    await db.user.upsert({
      where: { id: user.id },
      create: { ...user, emailVerified: new Date() },
      update: { name: user.name, email: user.email },
    });
  }

  await createSampleWorld(
    db,
    Object.fromEntries(sampleAccounts.map((p) => [p.id, p.id])),
  );
  console.log("Seeded 4 groups for demo@hatian.app");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
