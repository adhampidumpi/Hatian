import { NotFoundState } from "@/components/not-found-state";
import { PageBody } from "@/components/shell/page-layout";

/** A missing group or expense: shown inside the app shell. */
export default function AppNotFound() {
  return (
    <PageBody>
      <NotFoundState />
    </PageBody>
  );
}
