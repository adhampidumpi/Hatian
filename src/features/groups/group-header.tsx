"use client";

import { ChevronLeft, Download, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useShareInvite } from "@/features/invites/use-share-invite";
import { PresenceLine } from "@/features/live/presence-line";
import { GroupBalance } from "./group-balance";
import { GroupTabs } from "./group-tabs";
import { AvatarStack } from "./member-avatar";
import { useGroup } from "./use-group";

/**
 * Top of every group tab. Phone: back, share and settings icons, then the
 * balance card with Settle up / Balances. Desktop: title row with actions;
 * the balance lives in the side rail.
 */
export function GroupHeader({ groupId }: { groupId: string }) {
  const group = useGroup(groupId);
  const { share, isPending } = useShareInvite(group.id, group.name);
  const people = group.members.filter((m) => !m.removed);

  const meta = [
    group.firstDate && group.lastDate
      ? formatDateRange(group.firstDate, group.lastDate)
      : null,
    `${people.length} ${people.length === 1 ? "person" : "people"}`,
    group.currency,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-2 flex items-center justify-between lg:hidden">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex size-11 items-center justify-center rounded-full hover:bg-line-soft"
        >
          <ChevronLeft size={24} strokeWidth={2} aria-hidden />
        </Link>
        <div className="flex">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Share invite link"
            onClick={() => void share()}
            disabled={isPending}
          >
            <Share2 size={22} strokeWidth={1.8} aria-hidden />
          </Button>
          <Link
            href={`/groups/${group.id}/settings`}
            aria-label="Group settings"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <Settings size={22} strokeWidth={1.8} aria-hidden />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.02em] lg:text-[34px] lg:tracking-[-0.025em]">
              {group.name}
            </h1>
            <p className="mt-0.5 text-[14px] text-ink-3 lg:text-[15px]">
              {meta.join(" · ")}
              <span className="hidden lg:inline">
                {" · "}simplified debts {group.simplifyDebts ? "on" : "off"}
              </span>
            </p>
          </div>
          <div className="lg:hidden">
            <AvatarStack members={people} />
          </div>
        </div>
        <div className="hidden gap-2 lg:flex">
          <Button
            variant="outline"
            onClick={() => void share()}
            disabled={isPending}
          >
            <Share2 size={16} aria-hidden /> Share invite link
          </Button>
          {group.expenseCount > 0 && (
            <a
              href={`/groups/${group.id}/export`}
              download
              className={buttonVariants({ variant: "outline" })}
            >
              <Download size={16} aria-hidden /> Export CSV
            </a>
          )}
          <Link
            href={`/groups/${group.id}/settings`}
            aria-label="Group settings"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "rounded-lg",
            )}
          >
            <Settings size={18} aria-hidden />
          </Link>
        </div>
      </div>

      <div className="rounded-[18px] border border-line bg-card p-4 lg:hidden">
        <GroupBalance group={group} />
        {group.expenseCount > 0 && (
          <div className="mt-3.5 grid grid-cols-2 gap-2.5">
            <Link
              href={`/groups/${group.id}/balances#settle-up`}
              className={buttonVariants({ size: "lg" })}
            >
              Settle up
            </Link>
            <Link
              href={`/groups/${group.id}/balances`}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Balances
            </Link>
          </div>
        )}
      </div>

      <GroupTabs groupId={group.id} />
      <PresenceLine groupId={group.id} />
    </div>
  );
}
