"use client";

import { useId } from "react";
import { MemberAvatar } from "@/features/groups/member-avatar";
import { currencySymbol, formatMoney } from "@/lib/money/format";
import type { SplitMode } from "@/lib/money/split";
import { memberColors } from "@/lib/palette";
import { cn } from "@/lib/utils";
import {
  formatPercent,
  parsePercent,
  PERCENT_STEP_BP,
  SHARES_MAX,
  type SplitState,
  type SplitView,
} from "./split-state";
import { StepperInput } from "./stepper-input";

export type EditorMember = {
  id: string;
  /** "You" for the signed-in member, otherwise their name. */
  label: string;
  name: string;
  colorIndex: number;
};

const modes: { id: SplitMode; label: string }[] = [
  { id: "EQUAL", label: "Equally" },
  { id: "SHARES", label: "Shares" },
  { id: "PERCENT", label: "%" },
  { id: "EXACT", label: "Exact" },
];

/** The Split card: method switch, share bar, one row per person. */
export function SplitEditor({
  state,
  view,
  members,
  currency,
  onChange,
}: {
  state: SplitState;
  view: SplitView;
  members: EditorMember[];
  currency: string;
  onChange: (state: SplitState) => void;
}) {
  const headingId = useId();
  const set = <K extends "included" | "shares" | "percent" | "exact">(
    key: K,
    id: string,
    value: SplitState[K][string],
  ) => onChange({ ...state, [key]: { ...state[key], [id]: value } });
  const symbol = currencySymbol(currency);
  const showAmount = (id: string) => {
    const amount = view.amounts[id];
    return amount == null ? "—" : formatMoney(amount, currency);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-[18px] border border-line bg-card p-3.5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-[15px] font-semibold">
          Split
        </h2>
        <span className="text-[13px] text-ink-3">{view.summary}</span>
      </div>

      <div
        role="group"
        aria-label="Split method"
        className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-line-soft p-1"
      >
        {modes.map((mode) => {
          const on = mode.id === state.mode;
          return (
            <button
              key={mode.id}
              type="button"
              aria-pressed={on}
              aria-label={mode.id === "PERCENT" ? "Percent" : undefined}
              onClick={() => onChange({ ...state, mode: mode.id })}
              className={cn(
                "h-[38px] rounded-[9px] text-[14px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink pointer-coarse:h-11",
                on ? "bg-card text-ink shadow-sm" : "text-ink-2",
              )}
            >
              {mode.label}
            </button>
          );
        })}
      </div>

      <div
        aria-hidden
        className="mt-3.5 flex h-2 gap-0.5 overflow-hidden rounded bg-line-soft"
      >
        {view.segments.map((segment) => {
          const member = members.find((m) => m.id === segment.memberId);
          return (
            <span
              key={segment.memberId}
              className="block h-2"
              style={{
                width: `${segment.fraction * 100}%`,
                background: memberColors(member?.colorIndex ?? 0).bar,
              }}
            />
          );
        })}
      </div>

      <ul className="mt-2">
        {members.map((member) => {
          const inSplit = view.amounts[member.id] != null;
          return (
            <li
              key={member.id}
              className={cn(
                "flex min-h-14 items-center gap-3 border-b border-line-soft last:border-b-0",
                state.mode !== "EXACT" &&
                  !inSplit &&
                  view.valid &&
                  "opacity-55",
              )}
            >
              <MemberAvatar member={member} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                {member.label}
              </span>

              {state.mode === "EQUAL" && (
                <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
                  <span className="min-w-[84px] text-right amount text-[14px]">
                    {showAmount(member.id)}
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(state.included[member.id])}
                    onChange={(e) =>
                      set("included", member.id, e.target.checked)
                    }
                    aria-label={`Include ${member.label}`}
                    className="size-[22px] cursor-pointer accent-ink"
                  />
                </label>
              )}

              {state.mode === "SHARES" && (
                <div className="flex items-center gap-2">
                  <span className="min-w-[72px] text-right amount text-[13px] text-ink-3">
                    {showAmount(member.id)}
                  </span>
                  <StepperInput
                    label={`Shares for ${member.label}`}
                    value={state.shares[member.id] ?? 0}
                    format={String}
                    parse={(t) => (/^\d{1,2}$/.test(t) ? Number(t) : null)}
                    step={1}
                    min={0}
                    max={SHARES_MAX}
                    onChange={(v) => set("shares", member.id, v)}
                  />
                </div>
              )}

              {state.mode === "PERCENT" && (
                <div className="flex items-center gap-2">
                  <span className="min-w-[72px] text-right amount text-[13px] text-ink-3">
                    {showAmount(member.id)}
                  </span>
                  <StepperInput
                    label={`Percent for ${member.label}`}
                    value={state.percent[member.id] ?? 0}
                    format={formatPercent}
                    parse={parsePercent}
                    step={PERCENT_STEP_BP}
                    min={0}
                    max={10_000}
                    onChange={(v) => set("percent", member.id, v)}
                  />
                </div>
              )}

              {state.mode === "EXACT" && (
                <div className="flex h-11 w-[132px] items-center rounded-xl border border-line-strong bg-card px-2.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
                  <span className="amount text-[14px] text-ink-3" aria-hidden>
                    {symbol}
                  </span>
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={state.exact[member.id] ?? ""}
                    onChange={(e) => set("exact", member.id, e.target.value)}
                    aria-label={`Amount for ${member.label}`}
                    className="min-w-0 flex-1 bg-transparent text-right amount text-[15px] outline-none"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {view.roundNote && (
        <p className="mt-3 rounded-[10px] bg-paper px-3 py-2.5 text-[13px] leading-snug text-ink-2">
          {view.roundNote}
        </p>
      )}
    </section>
  );
}
