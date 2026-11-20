/** Placeholder for screens built in a later phase. */
export function ComingSoon({
  phase,
  children,
}: {
  phase: number;
  children: React.ReactNode;
}) {
  return (
    <p className="rounded-2xl border border-dashed border-line-strong p-5 text-[15px] text-ink-2">
      {children} <span className="text-ink-3">Coming in phase {phase}.</span>
    </p>
  );
}
