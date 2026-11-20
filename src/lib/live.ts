/**
 * What the live subscription sends: "ready" once the server is listening
 * (so nothing after it can be missed), then events.
 */
export type LiveMessage = LiveEvent | { type: "ready" };

/**
 * Events pushed to browsers. Kept small (Postgres NOTIFY payloads are capped
 * at 8000 bytes) and free of data: clients refetch what changed, so the
 * usual authorisation applies to everything they see.
 */
export type LiveEvent =
  | {
      type: "changed";
      groupId: string;
      /** The user who made the change (their own browser already knows). */
      actorUserId: string;
    }
  | {
      type: "presence";
      groupId: string;
      actorUserId: string;
      memberId: string;
      name: string;
      colorIndex: number;
      groupName: string;
      /** What they're doing; null means they stopped. */
      activity: "adding-expense" | "editing-expense" | null;
      /** Epoch ms after which to forget it if no heartbeat arrives. */
      until: number;
    };

/** How long a presence heartbeat lasts; the editor renews it sooner. */
export const PRESENCE_TTL_MS = 15_000;
export const PRESENCE_HEARTBEAT_MS = 8_000;
