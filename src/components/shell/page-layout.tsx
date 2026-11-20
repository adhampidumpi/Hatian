import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
