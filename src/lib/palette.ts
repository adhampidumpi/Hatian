/**
 * Member avatar and split-bar colours from docs/design-system.md, assigned
 * by the member's position in the group so the same person keeps the same
 * colour. CSS variables (globals.css), so dark mode can swap them.
 */
const MEMBER_COLOURS = 5;

export function memberColors(index: number) {
  const n = (((index % MEMBER_COLOURS) + MEMBER_COLOURS) % MEMBER_COLOURS) + 1;
  return {
    bg: `var(--member-${n}-bg)`,
    fg: `var(--member-${n}-fg)`,
    bar: `var(--member-${n}-bar)`,
  };
}

/** Group icon tiles (Home list). Settled groups use the neutral tile. */
export const groupTilePalette = [1, 2, 3, 4].map((n) => ({
  bg: `var(--group-${n}-bg)`,
  fg: `var(--group-${n}-fg)`,
}));

export const settledTile = { bg: "var(--tile)", fg: "var(--ink-2)" };

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length > 1
      ? parts[0]![0]! + parts[parts.length - 1]![0]!
      : parts[0]!.slice(0, 2);
  return letters.toUpperCase();
}
