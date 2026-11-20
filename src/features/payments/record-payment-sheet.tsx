"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { memberLabel, type Group } from "@/features/groups/use-group";
import { todayIso } from "@/lib/dates";
import {
  currencySymbol,
  formatDecimal,
  formatMoney,
  parseAmount,
} from "@/lib/money/format";
import { cn } from "@/lib/utils";
import {
  PAYMENT_METHODS,
  paymentMethodLabels,
  type PaymentMethod,
} from "@/lib/validation/payments";
import { useTRPC, useTRPCClient } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";

export type PaymentDraft = { fromId: string; toId: string };

/**
 * Record that someone paid someone back: the sheet from the design, with
 * partial payments ("Partial: ₱X still owed") and one-tap "Pay in full".
 */
export function RecordPaymentSheet({
  group,
  draft,
  owedBetween,
  onClose,
}: {
  group: Group;
  /** Who paid whom to start with; null keeps the sheet closed. */
  draft: PaymentDraft | null;
  /** What `from` currently owes `to` (0 if nothing). */
  owedBetween: (fromId: string, toId: string) => number;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog
      open={draft !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <ResponsiveDialogContent className="max-h-[92dvh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record a payment</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="sr-only">
            Who paid whom, how much and how.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {draft && (
          <PaymentForm
            key={`${draft.fromId}-${draft.toId}`}
            group={group}
            draft={draft}
            owedBetween={owedBetween}
            onDone={onClose}
          />
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const selectClass =
  "h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-card px-3 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function PaymentForm({
  group,
  draft,
  owedBetween,
  onDone,
}: {
  group: Group;
  draft: PaymentDraft;
  owedBetween: (fromId: string, toId: string) => number;
  onDone: () => void;
}) {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const refresh = useRefreshData();
  const people = group.members.filter((m) => !m.removed);
  const nameOf = (id: string) => {
    const m = people.find((p) => p.id === id);
    return m ? memberLabel(m) : "Someone";
  };

  const [fromId, setFromId] = useState(draft.fromId);
  const [toId, setToId] = useState(draft.toId);
  const owed = owedBetween(fromId, toId);
  const [amountText, setAmountText] = useState(
    owed > 0 ? formatDecimal(owed, group.currency) : "",
  );
  const [method, setMethod] = useState<PaymentMethod>("GCASH");
  const [reference, setReference] = useState("");

  const amount = amountText.trim()
    ? parseAmount(amountText, group.currency)
    : null;
  const money = (n: number) => formatMoney(n, group.currency);
  const from = nameOf(fromId);
  const to = nameOf(toId);
  const toLower = to === "You" ? "you" : to;
  const owes = from === "You" ? "owe" : "owes";

  let hint: { text: string; warn?: boolean } | null = null;
  if (fromId === toId)
    hint = { text: "Pick two different people.", warn: true };
  else if (!amount) hint = { text: "Enter an amount", warn: true };
  else if (owed > 0 && amount === owed)
    hint = { text: `Clears what ${from} ${owes} ${toLower}` };
  else if (owed > 0 && amount < owed)
    hint = { text: `Partial: ${money(owed - amount)} still owed` };
  else if (owed > 0)
    hint = {
      text: `${money(amount - owed)} more than ${from} ${owes} ${toLower}`,
      warn: true,
    };
  else if (owed === 0)
    hint = {
      text: `${from} ${from === "You" ? "don't" : "doesn't"} owe ${toLower} anything right now`,
      warn: true,
    };

  const valid = Boolean(amount) && fromId !== toId;

  const record = useMutation(
    trpc.payments.record.mutationOptions({
      onSuccess: async ({ id }) => {
        onDone();
        await refresh();
        toast.success(
          `Recorded ${money(amount ?? 0)} from ${from} to ${toLower}`,
          {
            action: {
              label: "Undo",
              onClick: async () => {
                await client.payments.delete.mutate({
                  groupId: group.id,
                  paymentId: id,
                });
                await refresh();
              },
            },
          },
        );
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  return (
    <form
      noValidate
      className="flex flex-col gap-5 px-4 pb-6 lg:px-0 lg:pb-0"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid || !amount) return;
        record.mutate({
          groupId: group.id,
          fromId,
          toId,
          amount,
          method,
          reference: reference.trim() || undefined,
          date: todayIso(),
        });
      }}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="payment-from" className="sr-only">
          Who paid
        </label>
        <select
          id="payment-from"
          value={fromId}
          onChange={(e) => setFromId(e.target.value)}
          className={selectClass}
        >
          {people.map((m) => (
            <option key={m.id} value={m.id}>
              {memberLabel(m)}
            </option>
          ))}
        </select>
        <span className="flex items-center gap-1 text-[14px] text-ink-3">
          paid <ArrowRight size={16} aria-hidden />
        </span>
        <label htmlFor="payment-to" className="sr-only">
          Who was paid
        </label>
        <select
          id="payment-to"
          value={toId}
          onChange={(e) => setToId(e.target.value)}
          className={selectClass}
        >
          {people.map((m) => (
            <option key={m.id} value={m.id}>
              {memberLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-amount">Amount</Label>
        <div className="flex items-center gap-2 rounded-[14px] border border-line bg-card px-3.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
          <span className="amount text-[18px] text-ink-3" aria-hidden>
            {currencySymbol(group.currency)}
          </span>
          <input
            id="payment-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-describedby="payment-hint"
            className="h-14 min-w-0 flex-1 bg-transparent amount-lg text-[26px] font-medium outline-none"
          />
        </div>
        <div className="flex min-h-11 items-center justify-between gap-2">
          <span
            id="payment-hint"
            className={cn(
              "text-[13px]",
              hint?.warn ? "text-owe" : "text-ink-3",
            )}
          >
            {hint?.text}
          </span>
          {owed > 0 && amount !== owed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAmountText(formatDecimal(owed, group.currency))}
            >
              Pay in full
            </Button>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          How did {from === "You" ? "you" : from} pay?
        </legend>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => {
            const on = m === method;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={on}
                onClick={() => setMethod(m)}
                className={cn(
                  "h-11 rounded-full border px-4 text-[14px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-card text-ink",
                )}
              >
                {paymentMethodLabels[m]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-reference">
          Reference no. or note <span className="text-ink-3">(optional)</span>
        </Label>
        <Input
          id="payment-reference"
          autoComplete="off"
          maxLength={120}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={
            method === "CASH"
              ? "e.g. paid at the airport"
              : `e.g. ${paymentMethodLabels[method]} ref 1029 384 7756`
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" size="xl" disabled={!valid || record.isPending}>
          {valid && amount
            ? `Record ${money(amount)} via ${paymentMethodLabels[method]}`
            : "Record payment"}
        </Button>
        <p className="text-center text-[12px] text-ink-3">
          Everyone in {group.name} will see this. It can be undone.
        </p>
      </div>
    </form>
  );
}
