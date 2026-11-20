"use client";

import { ArrowRight } from "lucide-react";
import { useId, useState } from "react";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/features/groups/member-avatar";
import { SimplifySwitch } from "@/features/groups/simplify-switch";
import { memberLabel, type Group } from "@/features/groups/use-group";
import { shareOrCopy } from "@/features/invites/share";
import {
  RecordPaymentSheet,
  type PaymentDraft,
} from "@/features/payments/record-payment-sheet";
import { formatMoney } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import type { SettleUp, Transfer } from "./use-settle-up";

/**
 * Who should pay whom to settle the group, with the Simplify switch.
 * Money owed to you gets Remind; everything else gets Record.
 */
export function SuggestedPayments({
  group,
  settleUp,
  compact = false,
}: {
  group: Group;
  settleUp: SettleUp;
  /** The desktop rail: tighter rows, no switch. */
  compact?: boolean;
}) {
  const headingId = useId();
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const shown = group.simplifyDebts ? settleUp.simplified : settleUp.pairwise;
  const member = (id: string) => group.members.find((m) => m.id === id);
  const owedBetween = (fromId: string, toId: string) =>
    shown.find((t) => t.from === fromId && t.to === toId)?.amount ?? 0;

  const simplifiedCount = settleUp.simplified.length;
  const pairwiseCount = settleUp.pairwise.length;
  const caption =
    shown.length === 0
      ? "Everyone's settled up."
      : group.simplifyDebts
        ? simplifiedCount < pairwiseCount
          ? `${simplifiedCount} instead of ${pairwiseCount}`
          : `${simplifiedCount} ${simplifiedCount === 1 ? "payment" : "payments"}`
        : `${pairwiseCount} ${pairwiseCount === 1 ? "payment" : "payments"}, one per pair`;

  function remind(t: Transfer) {
    const debtor = member(t.from);
    void shareOrCopy({
      text: `Hi ${debtor?.name ?? "there"}, a reminder from Hatian: you owe me ${formatMoney(t.amount, group.currency)} for ${group.name}.`,
      copiedMessage: "Reminder copied. Paste it in your chat.",
    });
  }

  return (
    <section
      id={compact ? undefined : "settle-up"}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-4 rounded-[18px] border border-line bg-card",
        compact ? "p-[18px]" : "p-4",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-[15px] font-semibold">
            Suggested payments
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-3">{caption}</p>
        </div>
        {!compact && pairwiseCount > 0 && (
          <SimplifySwitch groupId={group.id} checked={group.simplifyDebts} />
        )}
      </div>

      {shown.length > 0 && (
        <ul className="mt-3">
          {shown.map((t) => {
            const from = member(t.from);
            const to = member(t.to);
            if (!from || !to) return null;
            const toMe = to.isMe;
            return (
              <li
                key={`${t.from}-${t.to}`}
                className="flex min-h-[60px] items-center gap-2.5 border-t border-line-soft"
              >
                {!compact && (
                  <span
                    className="flex shrink-0 items-center gap-0.5"
                    aria-hidden
                  >
                    <MemberAvatar member={from} size="sm" />
                    <ArrowRight size={12} className="text-ink-3" />
                    <MemberAvatar member={to} size="sm" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px]">
                    {memberLabel(from)} {from.isMe ? "pay" : "pays"}{" "}
                    {toMe ? "you" : to.name}
                  </span>
                  <Money
                    amount={t.amount}
                    currency={group.currency}
                    className="block text-[14px] font-medium"
                  />
                </span>
                {toMe ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => remind(t)}
                  >
                    Remind
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setDraft({ fromId: t.from, toId: t.to })}
                  >
                    Record
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <RecordPaymentSheet
        group={group}
        draft={draft}
        owedBetween={owedBetween}
        onClose={() => setDraft(null)}
      />
    </section>
  );
}
