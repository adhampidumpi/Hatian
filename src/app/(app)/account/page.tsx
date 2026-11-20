import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { PageBody, PageTitle } from "@/components/shell/page-header";
import { signOut } from "@/server/auth";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <PageBody>
      <PageTitle>Account</PageTitle>
      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-2xl bg-line-soft" />
        }
      >
        <AccountDetails />
      </Suspense>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </PageBody>
  );
}

async function AccountDetails() {
  const user = await requireUser();
  return (
    <dl className="grid gap-3 rounded-2xl border border-line bg-card p-5 text-[15px]">
      <div>
        <dt className="text-[13px] text-ink-3">Name</dt>
        <dd className="font-medium">{user.name ?? "Not set"}</dd>
      </div>
      <div>
        <dt className="text-[13px] text-ink-3">Email</dt>
        <dd className="font-medium">{user.email}</dd>
      </div>
    </dl>
  );
}
