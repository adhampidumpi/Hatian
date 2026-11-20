import { ImageResponse } from "next/og";

export const alt =
  "Hatian: split shared expenses with friends, housemates and trip groups";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card shown when the link is shared (LinkedIn, chat apps). */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 80,
        background: "#F5F3EE",
        color: "#17160F",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="64" height="64" viewBox="0 0 26 26">
          <path d="M13 2a11 11 0 0 0 0 22z" fill="#17160F" />
          <path
            d="M14.5 2.1a11 11 0 0 1 0 21.8"
            fill="none"
            stroke="#17160F"
            strokeWidth="2"
          />
        </svg>
        <span style={{ fontSize: 56, fontWeight: 700 }}>hatian</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <span
          style={{
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          Split it fairly, settle it fast.
        </span>
        <span style={{ fontSize: 34, color: "#55524A" }}>
          Shared expenses for trips and housemates: live balances and the fewest
          payments to settle up.
        </span>
      </div>
    </div>,
    size,
  );
}
