import { cn } from "@/lib/utils";
import { initials, memberColors } from "@/lib/palette";

type AvatarMember = { name: string; colorIndex: number };

const sizes = {
  sm: "size-7 text-[11px]",
  md: "size-8 text-[12px]",
  lg: "size-[34px] text-[13px]",
} as const;

/** Initials in the member's palette colour. Decorative: name it nearby. */
export function MemberAvatar({
  member,
  size = "md",
  className,
}: {
  member: AvatarMember;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const colors = memberColors(member.colorIndex);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizes[size],
        className,
      )}
      style={{ background: colors.bg, color: colors.fg }}
    >
      {initials(member.name)}
    </span>
  );
}

/** Overlapping avatars with an accessible list of names. */
export function AvatarStack({
  members,
  max = 6,
}: {
  members: (AvatarMember & { id: string; isMe?: boolean })[];
  max?: number;
}) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  const label = members.map((m) => (m.isMe ? "you" : m.name)).join(", ");
  return (
    <div role="img" aria-label={`Members: ${label}`} className="flex">
      {shown.map((m) => (
        <MemberAvatar
          key={m.id}
          member={m}
          className="-ml-1.5 ring-2 ring-card first:ml-0"
        />
      ))}
      {extra > 0 && (
        <span
          aria-hidden
          className="-ml-1.5 inline-flex size-8 items-center justify-center rounded-full bg-line-soft text-[12px] font-semibold text-ink-2 ring-2 ring-card"
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
