import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin, toErrorResponse } from "@/lib/serverAuth";
import { organizationFromDoc, writeAuditLog } from "@/lib/serverOrgData";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);

    const [orgsSnap, campaignsSnap, invitesSnap] = await Promise.all([
      adminDb.collection("organizations").get(),
      adminDb.collection("campaigns").get(),
      adminDb.collection("invites").get(),
    ]);

    const campaignsByOrg = new Map<string, number>();
    campaignsSnap.docs.forEach((doc) => {
      const orgId = doc.get("orgId");
      campaignsByOrg.set(orgId, (campaignsByOrg.get(orgId) ?? 0) + 1);
    });

    const invitesByOrg = new Map<string, { total: number; completed: number }>();
    invitesSnap.docs.forEach((doc) => {
      const orgId = doc.get("orgId");
      const current = invitesByOrg.get(orgId) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (doc.get("status") === "completed") current.completed += 1;
      invitesByOrg.set(orgId, current);
    });

    const organizations = orgsSnap.docs
      .map((doc) => {
        const org = organizationFromDoc(doc.id, doc.data());
        const invites = invitesByOrg.get(org.id) ?? { total: 0, completed: 0 };
        return {
          ...org,
          campaignCount: campaignsByOrg.get(org.id) ?? 0,
          inviteCount: invites.total,
          completedCount: invites.completed,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ organizations });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return new Response("Organization name is required", { status: 400 });

    const adminEmail =
      typeof body.adminEmail === "string" && body.adminEmail.trim()
        ? body.adminEmail.trim().toLowerCase()
        : undefined;
    const now = FieldValue.serverTimestamp();
    const docRef = await adminDb.collection("organizations").add({
      name,
      thresholdPercent: Number(body.thresholdPercent) || 80,
      useDefaultQuestions: body.useDefaultQuestions ?? true,
      ...(adminEmail ? { adminEmail } : {}),
      createdAt: now,
      updatedAt: now,
    });

    if (adminEmail) {
      await adminDb.collection("orgEmailLookup").doc(adminEmail).set({ orgId: docRef.id }, { merge: true });
    }

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId: docRef.id,
      action: "admin.organization.create",
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    const body = await request.json();
    const orgId = String(body.id ?? "");
    if (!orgId) return new Response("Organization id is required", { status: 400 });

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof body.name === "string") update.name = body.name.trim();
    if (body.thresholdPercent != null) update.thresholdPercent = Number(body.thresholdPercent) || 80;
    if (body.useDefaultQuestions != null) update.useDefaultQuestions = Boolean(body.useDefaultQuestions);

    await adminDb.collection("organizations").doc(orgId).update(update);
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: "admin.organization.update",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    const body = await request.json();
    const orgId = String(body.id ?? "");
    if (!orgId) return new Response("Organization id is required", { status: 400 });

    await adminDb.collection("organizations").doc(orgId).delete();
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: "admin.organization.delete",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
