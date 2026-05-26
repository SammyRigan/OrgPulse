import { NextResponse } from "next/server";
import { requireSuperAdmin, toErrorResponse } from "@/lib/serverAuth";
import { getOrgOrThrow, writeAuditLog } from "@/lib/serverOrgData";

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const action = String(body.action ?? "start");

    if (!orgId) return new Response("Organization id is required", { status: 400 });
    const org = await getOrgOrThrow(orgId);

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: `admin.impersonation.${action}`,
      metadata: { orgName: org.name },
    });

    return NextResponse.json({ ok: true, organization: org });
  } catch (error) {
    return toErrorResponse(error);
  }
}
