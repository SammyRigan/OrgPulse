import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";
import {
  campaignFromDoc,
  getOrgOrThrow,
  reportFromDoc,
  writeAuditLog,
} from "@/lib/serverOrgData";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedOrgId = url.searchParams.get("orgId");
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(request, requestedOrgId);
    const org = await getOrgOrThrow(orgId);

    const [campaignsSnap, reportsSnap] = await Promise.all([
      adminDb.collection("campaigns").where("orgId", "==", orgId).orderBy("createdAt", "desc").get(),
      adminDb.collection("reports").where("orgId", "==", orgId).orderBy("generatedAt", "desc").get(),
    ]);

    if (impersonating) {
      await writeAuditLog({
        actorUid: auth.uid,
        actorEmail: auth.email,
        orgId,
        action: "admin.impersonation.dashboard.view",
      });
    }

    return NextResponse.json({
      org,
      campaigns: campaignsSnap.docs.map((doc) => campaignFromDoc(doc.id, doc.data())),
      reports: reportsSnap.docs.map((doc) => reportFromDoc(doc.id, doc.data())),
      impersonating,
      actorEmail: impersonating ? auth.email : undefined,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(request, body.orgId);
    const name = String(body.name ?? "").trim();
    if (!name) return new Response("Organization name is required", { status: 400 });

    const description = String(body.description ?? "").trim();
    const size = String(body.size ?? "").trim();
    const annualTurnover = String(body.annualTurnover ?? "").trim();
    const industry = String(body.industry ?? "").trim();
    const industryOther = String(body.industryOther ?? "").trim();

    await adminDb.collection("organizations").doc(orgId).update({
      name,
      description: description || FieldValue.delete(),
      size: size || FieldValue.delete(),
      annualTurnover: annualTurnover || FieldValue.delete(),
      industry: industry || FieldValue.delete(),
      industryOther: industry === "Other" ? (industryOther || FieldValue.delete()) : FieldValue.delete(),
      thresholdPercent: Number(body.thresholdPercent) || 80,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: impersonating ? "admin.impersonation.organization.update" : "org.organization.update",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
