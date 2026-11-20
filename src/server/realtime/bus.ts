import "server-only";
import { EventEmitter } from "node:events";
import pg from "pg";
import type { Prisma } from "@/generated/prisma/client";
import type { LiveEvent } from "@/lib/live";
import { db } from "../db";

/**
 * Live updates over Postgres LISTEN/NOTIFY.
 *
 * publish() runs pg_notify inside the caller's transaction, so an event is
 * delivered only if the change commits. Each server process keeps one
 * listening connection and fans events out to its SSE subscribers through
 * an in-process emitter, so it works across many instances with no extra
 * service. LISTEN needs a direct (unpooled) connection: set
 * DATABASE_URL_UNPOOLED when DATABASE_URL goes through a pooler.
 */
const CHANNEL = "hatian_live";

export function publish(
  event: LiveEvent,
  client: Prisma.TransactionClient | typeof db = db,
) {
  // A PrismaPromise, so it can also join a batch $transaction([...]).
  return client.$executeRaw`SELECT pg_notify(${CHANNEL}, ${JSON.stringify(event)})`;
}

type Listener = {
  emitter: EventEmitter;
  client: pg.Client | null;
  connecting: Promise<void> | null;
};

// One per process, kept across hot reloads in development.
const globalForBus = globalThis as unknown as { liveBus?: Listener };
const bus: Listener = (globalForBus.liveBus ??= {
  emitter: new EventEmitter().setMaxListeners(0),
  client: null,
  connecting: null,
});

async function connect(): Promise<void> {
  const client = new pg.Client({
    connectionString:
      process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  });
  client.on("notification", (message) => {
    if (message.channel !== CHANNEL || !message.payload) return;
    try {
      bus.emitter.emit("event", JSON.parse(message.payload) as LiveEvent);
    } catch {
      // Ignore payloads that aren't ours.
    }
  });
  client.on("error", () => reconnect());
  client.on("end", () => reconnect());
  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);
  bus.client = client;
}

function reconnect() {
  if (bus.client === null) return;
  bus.client = null;
  bus.connecting = null;
  // Retry shortly if anyone is still listening; SSE clients resume meanwhile.
  if (bus.emitter.listenerCount("event") > 0) {
    setTimeout(() => void ensureListening().catch(() => reconnect()), 1_000);
  }
}

/** Start the process's listener on first use. */
export async function ensureListening() {
  if (bus.client) return;
  bus.connecting ??= connect().catch((error) => {
    bus.connecting = null;
    throw error;
  });
  await bus.connecting;
}

/** The in-process event stream every subscription reads from. */
export const liveEvents = bus.emitter;
