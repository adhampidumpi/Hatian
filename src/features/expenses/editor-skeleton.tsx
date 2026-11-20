export function EditorSkeleton() {
  return (
    <div
      aria-hidden
      className="mx-auto flex w-full max-w-xl flex-col gap-3.5 px-5 pt-16 lg:pt-20"
    >
      <div className="h-[70px] animate-pulse rounded-[18px] bg-line-soft" />
      <div className="h-12 animate-pulse rounded-[14px] bg-line-soft" />
      <div className="h-80 animate-pulse rounded-[18px] bg-line-soft" />
    </div>
  );
}
