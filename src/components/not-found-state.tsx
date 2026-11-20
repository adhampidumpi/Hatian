import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** A page or group that doesn't exist, or isn't yours to see. */
export function NotFoundState() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-[22px] font-bold tracking-[-0.02em]">
        Page not found
      </h1>
      <p className="text-[15px] text-ink-2">
        This page doesn&apos;t exist, or it belongs to a group you&apos;re not
        in. If a friend sent you here, ask them for a fresh invite link.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to Home
      </Link>
    </div>
  );
}
