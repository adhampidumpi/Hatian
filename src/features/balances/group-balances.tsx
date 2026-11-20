"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGroup } from "@/features/groups/use-group";
import {
  RecordPaymentSheet,
  type PaymentDraft,
} from "@/features/payments/record-payment-sheet";
import { BalanceBars } from "./balance-bars";
import { SuggestedPayments } from "./suggested-payments";
import { useSettleUp } from "./use-settle-up";

/** The Balances tab: who's up and down, then how to settle. */
export function GroupBalances({ groupId }: { groupId: string }) {
  const group = useGroup(groupId);
  const settleUp = useSettleUp(groupId);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const shown = group.simplifyDebts ? settleUp.simplified : settleUp.pairwise;
  const others = group.members.filter((m) => !m.removed && !m.isMe);

  if (group.expenseCount === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line-strong p-6 text-[15px] text-ink-2">
        Balances appear once the group has expenses.
      </p>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <BalanceBars group={group} balances={settleUp.balances} />
      <SuggestedPayments group={group} settleUp={settleUp} />
      <p className="mx-1 text-[12px] leading-relaxed text-ink-3">
        Simplifying changes who pays whom, never how much anyone ends up paying
        overall. Anyone in the group can turn it off.
      </p>
      {others.length > 0 && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() =>
            setDraft({ fromId: group.me.memberId, toId: others[0]!.id })
          }
        >
          Record another payment
        </Button>
      )}
      <RecordPaymentSheet
        group={group}
        draft={draft}
        owedBetween={(from, to) =>
          shown.find((t) => t.from === from && t.to === to)?.amount ?? 0
        }
        onClose={() => setDraft(null)}
      />
    </div>
  );
}
