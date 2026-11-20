import { AppError } from "@/server/services/errors";
import { exportGroupCsv } from "@/server/services/export";
import { getSessionUser } from "@/server/session";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/groups/[groupId]/export">,
) {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { groupId } = await params;
  try {
    const { filename, csv } = await exportGroupCsv(user.id, groupId);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      return new Response(error.message, { status: 404 });
    }
    throw error;
  }
}
