import { Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { initials, memberColors } from "@/lib/palette";
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
export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pt-2 lg:px-8 lg:pt-7 lg:pb-10">
      {children}
    </main>
  );
}
