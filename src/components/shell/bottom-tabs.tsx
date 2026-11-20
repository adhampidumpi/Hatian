"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import {
  accountItem,
  activityItem,
  addExpenseHref,
  groupsItem,
  homeItem,
  isActive as isActivePath,
  isEditorRoute,
  type NavItem,
} from "./nav-items";

/** Primary navigation under `lg`: Home, Groups, Add (raised), Activity, Account. */
export function BottomTabs() {
  // The pathname is runtime data on dynamic routes, so the tabs prerender
  // with no active item and the highlight streams in.
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <CurrentTabBar />
    </Suspense>
  );
}

function CurrentTabBar() {
  return <TabBar pathname={usePathname()} />;
}

function TabBar({ pathname }: { pathname: string | null }) {
  if (isEditorRoute(pathname)) return null;
  const isActive = (href: string) =>
    pathname !== null && isActivePath(pathname, href);
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-paper px-2 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] lg:hidden"
    >
      <Tab item={homeItem} active={isActive(homeItem.href)} />
      <Tab item={groupsItem} active={isActive(groupsItem.href)} />
      <Link
        href={addExpenseHref(pathname)}
        aria-label="Add expense"
        className="flex size-14 items-center justify-center rounded-[18px] bg-ink text-paper"
      >
        <Plus size={26} strokeWidth={2.2} aria-hidden />
      </Link>
      <Tab item={activityItem} active={isActive(activityItem.href)} />
      <Tab item={accountItem} active={isActive(accountItem.href)} />
    </nav>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-12 min-w-15 flex-col items-center justify-center gap-[3px] text-[11px]",
        active ? "font-semibold text-ink" : "font-medium text-ink-3",
      )}
    >
      <Icon size={24} strokeWidth={active ? 2 : 1.8} aria-hidden />
      {item.label}
    </Link>
  );
}
