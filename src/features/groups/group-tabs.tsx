"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Expenses · Balances · Activity, underlined like the design. */
export function GroupTabs({ groupId }: { groupId: string }) {
  const pathname = usePathname();
  const base = `/groups/${groupId}`;
  const tabs = [
    { href: base, label: "Expenses" },
    { href: `${base}/balances`, label: "Balances" },
    { href: `${base}/activity`, label: "Activity" },
  ];
  return (
    <nav
      aria-label="Group sections"
      className="flex gap-7 border-b border-line"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px py-3 text-[15px]",
              active
                ? "border-b-2 border-ink font-semibold text-ink"
                : "font-medium text-ink-3 hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
