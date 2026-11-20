/**
 * Local PostgreSQL 17 without Docker, via embedded-postgres (real Postgres
 * binaries shipped as an npm package). Data lives in ./.pgdata.
 *
 *   pnpm db:local     # leave it running; Ctrl+C stops it
 *
 * Then set DATABASE_URL to the URL it prints, and run `pnpm db:deploy` and
 * `pnpm db:seed` once.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5433);
const DATABASE = "hatian";
const dataDir = path.resolve(import.meta.dirname, "..", ".pgdata");

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port: PORT,
  user: "postgres",
  password: "postgres",
  persistent: true,
  autoRehydrateSymlinks: true,
  onLog: () => {},
  onError: (error) => console.error("[postgres]", error),
});

if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
  console.log("Creating a new local database cluster in .pgdata …");
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase(DATABASE);
  console.log(`Created database "${DATABASE}".`);
} catch {
  // Already exists.
}

console.log(
  `\nPostgres 17 is running. Use this in .env:\n` +
    `DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/${DATABASE}"\n\n` +
    `Press Ctrl+C to stop.`,
);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping Postgres …");
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
