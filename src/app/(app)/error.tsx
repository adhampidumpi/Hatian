"use client";

import { ErrorState } from "@/components/error-state";
import { PageBody } from "@/components/shell/page-layout";

/** Errors in a signed-in page: the sidebar and tab bar stay. */
export default function AppError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <PageBody>
      <ErrorState {...props} />
    </PageBody>
  );
}
