import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getServerBaseUrl } from "@/lib/serverBaseUrl";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;
    const url = new URL(request.url);
    const { orgId } = await resolveAccessibleOrgId(request, url.searchParams.get("orgId"));

    const inviteSnap = await adminDb.collection("invites").doc(inviteId).get();
    if (!inviteSnap.exists) throw new Response("Invite not found", { status: 404 });

    const invite = inviteSnap.data() as { orgId?: string; token?: string };
    if (!invite?.orgId || invite.orgId !== orgId) {
      throw new Response("Invite not found", { status: 404 });
    }
    if (!invite.token) {
      throw new Response("Invite token missing", { status: 400 });
    }

    const baseUrl = getServerBaseUrl(request);

    return NextResponse.json({ link: `${baseUrl}/assess?token=${invite.token}` });
  } catch (error) {
    return toErrorResponse(error);
  }
}

