"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import {
  accountItem,
  activityItem,
  ADD_EXPENSE_HREF,
  addExpenseHref,
  homeItem,
  isActive,
  type NavItem,
} from "./nav-items";

/** "Add expense (N)": the current group's form when inside one. */
export function AddExpenseLink() {
  return (
    <Suspense fallback={<AddExpenseButton href={ADD_EXPENSE_HREF} />}>
      <CurrentAddExpenseButton />
    </Suspense>
  );
}

function CurrentAddExpenseButton() {
  return <AddExpenseButton href={addExpenseHref(usePathname())} />;
}

function AddExpenseButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex h-[46px] items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-semibold text-paper"
    >
      <Plus size={18} strokeWidth={2.2} aria-hidden />
      Add expense
      <kbd className="rounded-[5px] bg-paper/15 px-1.5 py-0.5 amount text-[11px]">
        N
      </kbd>
    </Link>
  );
}

export function SidebarNav() {
  // Prerender without a highlight; the active item streams in (the pathname
  // is runtime data on dynamic routes).
  return (
    <Suspense fallback={<NavList pathname={null} />}>
      <CurrentNavList />
    </Suspense>
  );
}

function CurrentNavList() {
  return <NavList pathname={usePathname()} />;
}

function NavList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Primary">
      <ul className="flex flex-col gap-0.5">
        {[homeItem, activityItem, accountItem].map((item) => (
          <li key={item.href}>
            <SidebarLink
              item={item}
              active={pathname !== null && isActive(pathname, item.href)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-[15px] font-medium",
        active
          ? "border border-line bg-card text-ink"
          : "text-ink-2 hover:bg-line-soft hover:text-ink",
      )}
    >
      <Icon size={20} strokeWidth={1.8} aria-hidden />
      {item.label}
    </Link>
  );
}

/** A group row in the sidebar; highlights when its page is open. */
export function SidebarGroupLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-[10px] border px-2.5",
        active
          ? "border-line bg-card"
          : "border-transparent hover:bg-line-soft",
      )}
    >
      {children}
    </Link>
  );
}
