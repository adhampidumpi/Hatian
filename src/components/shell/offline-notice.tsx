"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * A bar across the top while the device is offline. The live region stays
 * mounted so screen readers hear it appear. Data refetches on its own when
 * the connection comes back (TanStack Query and the live connection).
 */
export function OfflineNotice() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  return (
    <div
      role="status"
      className={
        online
          ? "sr-only"
          : "sticky top-0 z-40 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-[13px] font-medium text-paper"
      }
    >
      {!online && (
        <>
          <WifiOff size={15} aria-hidden />
          You&apos;re offline. Changes won&apos;t save until you reconnect.
        </>
      )}
    </div>
  );
}
