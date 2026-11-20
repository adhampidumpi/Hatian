import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { GroupIcon } from "@/features/groups/group-icon";
import { JoinChoices } from "@/features/invites/join-choices";
import { getSessionUser } from "@/server/session";
import { fetchOrNotFound, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Join a group" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <Logo />
      <Suspense
        fallback={
          <div className="h-72 animate-pulse rounded-[20px] bg-line-soft" />
        }
      >
        <Invite params={params} />
      </Suspense>
    </main>
  );
}

async function Invite({
  params,
}: {
  params: PageProps<"/invite/[token]">["params"];
}) {
  const { token } = await params;
  const user = await getSessionUser();
  const invite = await fetchOrNotFound(
    trpc.invites.preview.queryOptions({ token }),
  );
  if (invite.alreadyMember) redirect(`/groups/${invite.group.id}`);

  const others = invite.joinedNames.slice(0, 3).join(", ");
  return (
    <section
      aria-labelledby="invite-title"
      className="flex flex-col gap-5 rounded-[20px] border border-line bg-card p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-xl bg-owed-bg text-owed">
          <GroupIcon name={invite.group.icon} />
        </span>
        <div>
          <p className="text-[13px] text-ink-3">You&apos;re invited to</p>
          <h1
            id="invite-title"
            className="text-[22px] font-bold tracking-[-0.01em]"
          >
            {invite.group.name}
          </h1>
        </div>
      </div>
      <p className="text-[14px] text-ink-2">
        {invite.memberCount} {invite.memberCount === 1 ? "person" : "people"}
        {others && ` including ${others}`}.
      </p>

      {user ? (
        <JoinChoices
          token={token}
          groupName={invite.group.name}
          placeholders={invite.placeholders}
        />
      ) : (
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
          className={buttonVariants({ size: "xl" })}
        >
          Sign in to join
        </Link>
      )}
    </section>
  );
}
