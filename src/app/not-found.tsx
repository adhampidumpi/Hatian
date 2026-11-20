import { Logo } from "@/components/logo";
import { NotFoundState } from "@/components/not-found-state";

/** Unknown URLs (signed in or not, so no app shell). */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <Logo />
      <NotFoundState />
    </main>
  );
}
