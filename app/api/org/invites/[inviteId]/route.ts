import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";
import { inviteFromDoc, normalizeEmails, writeAuditLog } from "@/lib/serverOrgData";

async function getInviteForOrg(inviteId: string, orgId: string) {
  const inviteSnap = await adminDb.collection("invites").doc(inviteId).get();
  if (!inviteSnap.exists) throw new Response("Invite not found", { status: 404 });

  const data = inviteSnap.data() ?? {};
  if (data.orgId !== orgId) throw new Response("Invite not found", { status: 404 });

  return { ref: inviteSnap.ref, data, invite: inviteFromDoc(inviteSnap.id, data) };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;
    const body = await request.json();
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(request, body.orgId);
    const [email] = normalizeEmails([body.email]);

    if (!email) return new Response("A valid email is required", { status: 400 });

    const { ref, data } = await getInviteForOrg(inviteId, orgId);
    if (data.status === "completed") {
      return new Response("Completed invites cannot be edited", { status: 400 });
    }

    await ref.update({
      email,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snap = await ref.get();
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: impersonating ? "admin.impersonation.invite.update" : "org.invite.update",
      metadata: { inviteId, campaignId: data.campaignId, email },
    });

    return NextResponse.json({ invite: inviteFromDoc(snap.id, snap.data() ?? {}) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const { inviteId } = await params;
    const url = new URL(request.url);
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(
      request,
      url.searchParams.get("orgId")
    );

    const { ref, data } = await getInviteForOrg(inviteId, orgId);
    if (data.status === "completed") {
      return new Response("Completed invites cannot be deleted", { status: 400 });
    }

    await ref.delete();

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: impersonating ? "admin.impersonation.invite.delete" : "org.invite.delete",
      metadata: { inviteId, campaignId: data.campaignId, email: data.email },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
