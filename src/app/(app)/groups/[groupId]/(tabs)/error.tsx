"use client";

import { ErrorState } from "@/components/error-state";

/** A tab that failed: the group's header and tabs stay usable. */
export default function GroupTabError(props: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <ErrorState {...props} Heading="h2" />;
}
