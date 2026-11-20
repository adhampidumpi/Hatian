import { afterAll, describe, expect, it, vi } from "vitest";
import type { LiveEvent, LiveMessage } from "@/lib/live";
import { cleanUp, makeGroup, makeUser } from "@/test/factories";
import { createCaller } from "../api/root";
import { db } from "../db";
import { ensureListening, isListening, liveEvents, publish } from "./bus";

// The caller gets its user passed in; keep Auth.js (which needs the Next
// runtime) out of the test.
vi.mock("../session", () => ({ getSessionUser: async () => null }));

const created: string[] = [];
afterAll(() => cleanUp(created));

async function user(name: string) {
  const u = await makeUser(name);
  created.push(u.id);
  return u;
}

/** Everything `liveEvents` emits while `fn` runs, plus a moment after. */
async function captured(fn: () => Promise<unknown>) {
  await ensureListening();
  const seen: LiveEvent[] = [];
  const onEvent = (e: LiveEvent) => seen.push(e);
  liveEvents.on("event", onEvent);
  try {
    await fn();
    await new Promise((r) => setTimeout(r, 300));
  } finally {
    liveEvents.off("event", onEvent);
  }
  return seen;
}

describe("Postgres NOTIFY bus", () => {
  it("delivers an event only once its transaction commits", async () => {
    const tag = `g_${Date.now()}`;
    const seen = await captured(async () => {
      await db
        .$transaction(async (tx) => {
          await publish(
            {
              type: "changed",
              groupId: `${tag}_rolled_back`,
              actorUserId: "x",
            },
            tx,
          );
          throw new Error("roll back");
        })
        .catch(() => {});
      await db.$transaction(async (tx) => {
        await publish(
          { type: "changed", groupId: `${tag}_committed`, actorUserId: "x" },
          tx,
        );
      });
    });
    const groups = seen.map((e) => e.groupId);
    expect(groups).toContain(`${tag}_committed`);
    expect(groups).not.toContain(`${tag}_rolled_back`);
  });
});

describe("the listening connection", () => {
  it("closes a minute after the last subscriber leaves", async () => {
    const subscriber = () => {};
    liveEvents.on("event", subscriber);
    await ensureListening();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      liveEvents.off("event", subscriber);
      vi.advanceTimersByTime(59_000);
      expect(isListening()).toBe(true);
      vi.advanceTimersByTime(1_000);
      expect(isListening()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
    // …and opens again for the next one.
    await ensureListening();
    expect(isListening()).toBe(true);
  });
});

describe("live.events subscription", () => {
  it("sends members their group's events, never your own presence", async () => {
    const maria = await user("Maria");
    const stranger = await user("Stranger");
    const { groupId } = await makeGroup(maria, ["Ana"]);
    const strangers = await makeGroup(stranger, []);

    const controller = new AbortController();
    const caller = (u: typeof maria) =>
      createCaller({ user: u }, { signal: controller.signal });
    const mine = await caller(maria).live.events();
    const received: LiveMessage[] = [];
    const reading = (async () => {
      for await (const message of mine) received.push(message);
    })().catch(() => {});
    // Once it says it's listening, nothing after can be missed.
    await vi.waitFor(() => expect(received).toEqual([{ type: "ready" }]));

    await caller(maria).live.presence({ groupId, activity: "adding-expense" });
    await caller(stranger).live.presence({
      groupId: strangers.groupId,
      activity: "adding-expense",
    });
    await publish({ type: "changed", groupId, actorUserId: stranger.id });

    await vi.waitFor(() => expect(received).toHaveLength(2));
    await new Promise((r) => setTimeout(r, 300));
    controller.abort();
    await reading;

    // Only the change in Maria's group: not her own presence, nothing
    // from a group she isn't in.
    expect(received).toEqual([
      { type: "ready" },
      { type: "changed", groupId, actorUserId: stranger.id },
    ]);
  });

  it("refuses presence in a group you're not in", async () => {
    const maria = await user("Maria");
    const stranger = await user("Stranger");
    const { groupId } = await makeGroup(maria, []);
    await expect(
      createCaller({ user: stranger }).live.presence({
        groupId,
        activity: "adding-expense",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
