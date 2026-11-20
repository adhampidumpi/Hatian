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

/**
 * A minute after the last subscriber leaves, the listening connection
 * closes, so a serverless database (Neon) can scale to zero between
 * visitors. The next subscriber opens it again.
 */
const IDLE_CLOSE_MS = 60_000;

type Listener = {
  emitter: EventEmitter;
  client: pg.Client | null;
  connecting: Promise<void> | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

// One per process, kept across hot reloads in development.
const globalForBus = globalThis as unknown as { liveBus?: Listener };
const bus: Listener = (globalForBus.liveBus ??= createBus());

function createBus(): Listener {
  const created: Listener = {
    emitter: new EventEmitter().setMaxListeners(0),
    client: null,
    connecting: null,
    idleTimer: null,
  };
  created.emitter.on("newListener", (name) => {
    if (name !== "event" || !created.idleTimer) return;
    clearTimeout(created.idleTimer);
    created.idleTimer = null;
  });
  created.emitter.on("removeListener", (name) => {
    if (name !== "event" || created.emitter.listenerCount("event") > 0) return;
    created.idleTimer ??= setTimeout(closeIfIdle, IDLE_CLOSE_MS);
  });
  return created;
}

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
  client.on("error", () => dropped(client));
  client.on("end", () => dropped(client));
  await client.connect();
  await client.query(`LISTEN ${CHANNEL}`);
  bus.client = client;
}

/** The connection broke: reconnect while anyone is still listening. */
function dropped(client: pg.Client) {
  if (bus.client !== client) return;
  bus.client = null;
  bus.connecting = null;
  retrySoon();
}

function retrySoon() {
  setTimeout(() => {
    if (bus.emitter.listenerCount("event") === 0) return;
    ensureListening().catch(retrySoon);
  }, 1_000);
}

function closeIfIdle() {
  bus.idleTimer = null;
  const client = bus.client;
  if (!client || bus.emitter.listenerCount("event") > 0) return;
  bus.client = null;
  bus.connecting = null;
  void client.end().catch(() => {});
}

/** Whether this process holds a listening connection (for tests). */
export const isListening = () => bus.client !== null;

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
