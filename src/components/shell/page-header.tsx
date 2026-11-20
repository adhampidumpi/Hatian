import { ChevronLeft, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { initials, memberColors } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/session";

/** Mobile top bar from the Home design: logo, search, account avatar. */
export function MobileHeader() {
  return (
    <header className="flex items-center justify-between px-5 pt-5 pb-2 lg:hidden">
      <Logo />
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Search (coming soon)"
          disabled
          className="flex size-11 items-center justify-center rounded-full text-ink disabled:text-ink-3"
        >
          <Search size={22} strokeWidth={1.8} aria-hidden />
        </button>
        <Link
          href="/account"
          className="flex size-11 items-center justify-center"
        >
          {/* Initials are decorative; the name comes from this text. */}
          <span className="sr-only">Your account</span>
          <Suspense fallback={<AvatarCircle text="" />}>
            <UserAvatar />
          </Suspense>
        </Link>
      </div>
    </header>
  );
}

async function UserAvatar() {
  const user = await requireUser();
  return <AvatarCircle text={initials(user.name ?? user.email)} />;
}

function AvatarCircle({ text }: { text: string }) {
  const colors = memberColors(0);
  return (
    <span
      aria-hidden
      className="flex size-[34px] items-center justify-center rounded-full text-[13px] font-semibold"
      style={{ background: colors.bg, color: colors.fg }}
    >
      {text}
    </span>
  );
}

/** Page title: large on desktop, used by pages without the mobile logo bar. */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[26px] font-bold tracking-[-0.02em] lg:text-[34px] lg:tracking-[-0.025em]">
      {children}
    </h1>
  );
}

/** Standard page padding: 20px mobile, 32px desktop. */
export function PageBody({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  /** Use the full width (group pages with a side rail on desktop). */
  wide?: boolean;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-5 pt-2 lg:px-8 lg:pt-7 lg:pb-10",
        wide ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      {children}
    </main>
  );
}

/** Header for pages under a group: back link, title and a small subtitle. */
export function SubPageHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  actions,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="-mx-2 flex items-center gap-1 lg:mx-0">
      <Link
        href={backHref}
        aria-label={backLabel}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-line-soft lg:-ml-3"
      >
        <ChevronLeft size={24} strokeWidth={2} aria-hidden />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[20px] leading-tight font-bold tracking-[-0.01em] lg:text-[26px]">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[13px] text-ink-3">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </header>
  );
}
