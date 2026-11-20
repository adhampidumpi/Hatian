/** The hatian mark (a circle split in two) and wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <path d="M13 2a11 11 0 0 0 0 22z" fill="currentColor" />
        <path
          d="M14.5 2.1a11 11 0 0 1 0 21.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span className="text-[22px] font-bold tracking-[-0.02em]">hatian</span>
    </span>
  );
}
