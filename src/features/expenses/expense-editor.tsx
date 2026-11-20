"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, Paperclip, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PickerSheet } from "@/components/picker-sheet";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/features/groups/member-avatar";
import { useBroadcastPresence } from "@/features/live/use-broadcast-presence";
import { memberLabel, type Group } from "@/features/groups/use-group";
import { categories } from "@/lib/categories";
import { formatDay, todayIso } from "@/lib/dates";
import { formatDecimal, parseAmount } from "@/lib/money/format";
import { cn } from "@/lib/utils";
import { useTRPC, useTRPCClient } from "@/trpc/react";
import { useRefreshData } from "@/trpc/use-refresh";
import { CategoryTile, categoryName } from "./category-icon";
import { SplitEditor, type EditorMember } from "./split-editor";
import { evaluateSplit, initialSplit } from "./split-state";
import type { Expense } from "./use-expenses";

const chip =
  "relative flex h-10 items-center gap-2 rounded-full border border-line-strong bg-card px-3 text-[14px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink pointer-coarse:h-11";

/**
 * Add or edit an expense. A live calculator rather than a submit-and-check
 * form: every field changes the preview, so it holds plain state and
 * validates with the same split logic the server runs on save.
 */
export function ExpenseEditor({
  group,
  expense,
}: {
  group: Group;
  expense?: Expense;
}) {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const refresh = useRefreshData();
  const backHref = `/groups/${group.id}`;
  useBroadcastPresence(
    group.id,
    expense ? "editing-expense" : "adding-expense",
  );

  // Active members, plus anyone already on this expense who has since left.
  const members: EditorMember[] = useMemo(() => {
    const onExpense = new Set([
      expense?.paidById,
      ...(expense?.shares.map((s) => s.memberId) ?? []),
    ]);
    return group.members
      .filter((m) => !m.removed || onExpense.has(m.id))
      .map((m) => ({
        id: m.id,
        label: memberLabel(m),
        name: m.name,
        colorIndex: m.colorIndex,
      }));
  }, [group.members, expense]);

  const [amountText, setAmountText] = useState(
    expense ? formatDecimal(expense.amount, group.currency) : "",
  );
  const [description, setDescription] = useState(expense?.description ?? "");
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "other");
  const [paidById, setPaidById] = useState(
    expense?.paidById ?? group.me.memberId,
  );
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [note, setNote] = useState(expense?.note ?? "");
  const [split, setSplit] = useState(() =>
    initialSplit(
      members.map((m) => m.id),
      group.currency,
      expense && { mode: expense.splitMode, shares: expense.shares },
    ),
  );
  const [picker, setPicker] = useState<"category" | "payer" | null>(null);

  const amount = amountText.trim()
    ? parseAmount(amountText, group.currency)
    : null;
  const amountInvalid = amountText.trim() !== "" && amount === null;
  const view = evaluateSplit(split, amount, group.currency, members);
  const needsDescription = description.trim() === "";
  const status =
    view.valid && needsDescription ? "Add a description" : view.status;
  const canSave = view.valid && !needsDescription && Boolean(date);
  const payer = members.find((m) => m.id === paidById);

  const onSaved = async (message: string) => {
    await refresh();
    router.push(backHref);
    toast.success(message);
  };
  const create = useMutation(
    trpc.expenses.create.mutationOptions({
      onSuccess: () => onSaved("Expense added"),
      onError: (e) => toast.error(e.message),
    }),
  );
  const update = useMutation(
    trpc.expenses.update.mutationOptions({
      onSuccess: () => onSaved("Changes saved"),
      onError: (e) => toast.error(e.message),
    }),
  );
  const remove = useMutation(
    trpc.expenses.delete.mutationOptions({
      onSuccess: (_, ref) => {
        // This page's own query would now 404; drop it before refreshing
        // and leave first, so the refresh can't trip over it.
        queryClient.removeQueries({
          queryKey: trpc.expenses.get.queryKey(ref),
        });
        router.push(backHref);
        toast(`Deleted “${description}”`, {
          action: {
            label: "Undo",
            onClick: async () => {
              await client.expenses.restore.mutate(ref);
              await refresh();
            },
          },
        });
        void refresh();
      },
      onError: (e) => toast.error(e.message),
    }),
  );
  const saving = create.isPending || update.isPending;

  function save() {
    if (!canSave || amount === null) return;
    const input = {
      groupId: group.id,
      description: description.trim(),
      categoryId,
      date,
      amount,
      paidById,
      splitMode: split.mode,
      weights: view.weights,
      note: note.trim() || undefined,
    };
    if (expense) update.mutate({ ...input, expenseId: expense.id });
    else create.mutate(input);
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col lg:min-h-0 lg:py-7"
    >
      <header className="flex items-center gap-1 px-2 pt-3 pb-1">
        <Link
          href={backHref}
          aria-label="Close"
          className="flex size-11 items-center justify-center rounded-full hover:bg-line-soft"
        >
          <X size={22} aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold">
            {expense ? "Edit expense" : "Add expense"}
          </h1>
          <p className="truncate text-[13px] text-ink-3">in {group.name}</p>
        </div>
        {expense && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete expense"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate({ groupId: group.id, expenseId: expense.id })
            }
          >
            <Trash2 size={20} aria-hidden />
          </Button>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-2 pb-4">
        <div className="flex items-center gap-2.5 rounded-[18px] border border-line bg-card px-3.5 py-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
          <span className="flex h-11 items-center rounded-xl border border-line-strong bg-paper px-3 text-[14px] font-semibold">
            {group.currency}
          </span>
          <label htmlFor="expense-amount" className="sr-only">
            Amount
          </label>
          <input
            id="expense-amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus={!expense}
            placeholder="0.00"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={amountInvalid || undefined}
            aria-describedby={
              amountInvalid ? "expense-amount-error" : undefined
            }
            className="min-w-0 flex-1 bg-transparent text-right amount-lg text-[36px] font-medium outline-none placeholder:text-ink-3"
          />
        </div>
        {amountInvalid && (
          <p
            id="expense-amount-error"
            role="alert"
            className="-mt-2 text-[13px] text-owe"
          >
            Enter an amount like 1,250.50
          </p>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label={`Category: ${categoryName(categoryId)}. Change category`}
            onClick={() => setPicker("category")}
            className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-line bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <CategoryTile categoryId={categoryId} className="bg-transparent" />
          </button>
          <label htmlFor="expense-description" className="sr-only">
            Description
          </label>
          <input
            id="expense-description"
            placeholder="What was it for?"
            autoComplete="off"
            maxLength={100}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-[14px] border border-line bg-card px-3.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={chip}
            onClick={() => setPicker("payer")}
          >
            {payer && (
              <MemberAvatar
                member={payer}
                size="sm"
                className="size-[22px] text-[9px]"
              />
            )}
            Paid by{" "}
            <strong className="font-semibold">
              {payer?.label === "You" ? "you" : payer?.label}
            </strong>
            <ChevronDown size={14} aria-hidden />
          </button>

          <label className={chip}>
            <CalendarDays size={16} aria-hidden />
            <span aria-hidden>
              {date === todayIso() ? "Today" : formatDay(date)}
            </span>
            <input
              type="date"
              aria-label="Date"
              required
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>

          <button
            type="button"
            disabled
            className={cn(
              chip,
              "border-dashed border-ink-3 bg-transparent text-ink-2",
            )}
          >
            <Paperclip size={16} aria-hidden /> Receipt
            <span className="text-[12px] text-ink-3">soon</span>
          </button>
        </div>

        <SplitEditor
          state={split}
          view={view}
          members={members}
          currency={group.currency}
          onChange={setSplit}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="expense-note" className="text-[13px] text-ink-2">
            Note <span className="text-ink-3">(optional)</span>
          </label>
          <textarea
            id="expense-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-[14px] border border-line bg-card px-3.5 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>
      </div>

      <footer className="sticky bottom-0 flex flex-col gap-2 border-t border-line bg-paper px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)] lg:rounded-b-2xl">
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-center text-[14px]",
            canSave ? "text-ink" : "text-owe",
          )}
        >
          {status}
        </p>
        <Button type="submit" size="xl" disabled={!canSave || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </footer>

      <PickerSheet
        open={picker === "category"}
        onOpenChange={(open) => setPicker(open ? "category" : null)}
        title="Category"
        value={categoryId}
        onSelect={setCategoryId}
        options={categories.map((c) => ({
          value: c.id,
          label: c.name,
          icon: <CategoryTile categoryId={c.id} />,
        }))}
      />
      <PickerSheet
        open={picker === "payer"}
        onOpenChange={(open) => setPicker(open ? "payer" : null)}
        title="Who paid?"
        value={paidById}
        onSelect={setPaidById}
        options={members.map((m) => ({
          value: m.id,
          label: m.label,
          icon: <MemberAvatar member={m} />,
        }))}
      />
    </form>
  );
}
