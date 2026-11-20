import { BottomTabs } from "@/components/shell/bottom-tabs";
import { Sidebar } from "@/components/shell/sidebar";
import { LiveProvider } from "@/features/live/live-provider";

/**
 * Signed-in app chrome: bottom tab bar under `lg`, sidebar at `lg`+, and the
 * live connection. The layout itself never reads the session, so the chrome
 * prerenders into the static shell; each page checks the user inside its own
 * Suspense boundary.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <LiveProvider>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="min-w-0 flex-1 pb-28 lg:pb-0">{children}</div>
        <BottomTabs />
      </div>
    </LiveProvider>
  );
}
