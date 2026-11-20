/**
 * Member avatar colours from docs/design-system.md, assigned by the member's
 * position in the group so the same person keeps the same colour.
 */
export const memberPalette = [
  { bg: "#DCE6F2", fg: "#1E3A5F", bar: "#3B5B85" },
  { bg: "#F3E1D3", fg: "#7A3E12", bar: "#C2703D" },
  { bg: "#E3EEDB", fg: "#2F5A1E", bar: "#5E8C4A" },
  { bg: "#EDE2F0", fg: "#5B2D6E", bar: "#8C5A9E" },
  { bg: "#F5E9C8", fg: "#6B4E00", bar: "#B08A12" },
] as const;

export function memberColors(index: number) {
  return memberPalette[
    ((index % memberPalette.length) + memberPalette.length) %
      memberPalette.length
  ]!;
}

/** Group icon tiles (Home list). Settled groups use the neutral tile. */
export const groupTilePalette = [
  { bg: "#DCEBE6", fg: "#0B4E39" },
  { bg: "#F3E1D3", fg: "#7A3E12" },
  { bg: "#E8E4F2", fg: "#45337A" },
  { bg: "#F5E9C8", fg: "#6B4E00" },
] as const;

export const settledTile = { bg: "#ECE9E2", fg: "#55524A" } as const;

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const letters =
    parts.length > 1
      ? parts[0]![0]! + parts[parts.length - 1]![0]!
      : parts[0]!.slice(0, 2);
  return letters.toUpperCase();
}
