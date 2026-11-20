"use client";

import { useState } from "react";

/**
 * − value + control from the design, where the value can also be typed.
 * Keeps a draft while typing ("33." is fine mid-edit) and commits parsed
 * values; on blur it snaps back to the formatted value.
 */
export function StepperInput({
  label,
  value,
  format,
  parse,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  format: (value: number) => string;
  parse: (text: string) => number | null;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const button =
    "flex h-10 w-9 items-center justify-center text-[18px] text-ink disabled:text-ink-3 pointer-coarse:h-11 pointer-coarse:w-11";

  return (
    <div className="flex items-center rounded-xl border border-line-strong has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
      <button
        type="button"
        aria-label={`Less for ${label}`}
        className={button}
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <input
        aria-label={`${label}`}
        inputMode="decimal"
        autoComplete="off"
        value={draft ?? format(value)}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          setDraft(e.target.value);
          const parsed = parse(e.target.value);
          if (parsed !== null) onChange(clamp(parsed));
        }}
        onBlur={() => setDraft(null)}
        className="w-12 bg-transparent text-center amount text-[14px] font-medium outline-none"
      />
      <button
        type="button"
        aria-label={`More for ${label}`}
        className={button}
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}
