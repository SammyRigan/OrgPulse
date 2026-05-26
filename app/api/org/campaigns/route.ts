import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";
import { campaignFromDoc, writeAuditLog } from "@/lib/serverOrgData";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(request, body.orgId);
    const name = String(body.name ?? "").trim();
    if (!name) return new Response("Campaign name is required", { status: 400 });

    const docRef = await adminDb.collection("campaigns").add({
      orgId,
      name,
      status: "active",
      ...(String(body.passcode ?? "").trim() ? { passcode: String(body.passcode).trim() } : {}),
      createdAt: FieldValue.serverTimestamp(),
    });

    const snap = await docRef.get();
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: impersonating ? "admin.impersonation.campaign.create" : "org.campaign.create",
      metadata: { campaignId: docRef.id },
    });

    return NextResponse.json({ campaign: campaignFromDoc(snap.id, snap.data() ?? {}) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
