import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";
import {
  buildReportDoc,
  getCampaignOrThrow,
  getOrgOrThrow,
  reportFromDoc,
  writeAuditLog,
} from "@/lib/serverOrgData";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { orgId } = await resolveAccessibleOrgId(request, url.searchParams.get("orgId"));
    const snap = await adminDb
      .collection("reports")
      .where("orgId", "==", orgId)
      .orderBy("generatedAt", "desc")
      .get();

    return NextResponse.json({ reports: snap.docs.map((doc) => reportFromDoc(doc.id, doc.data())) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(request, body.orgId);
    const campaignId = String(body.campaignId ?? "");
    if (!campaignId) return new Response("Campaign id is required", { status: 400 });

    const [org, campaign] = await Promise.all([getOrgOrThrow(orgId), getCampaignOrThrow(campaignId)]);
    if (campaign.orgId !== orgId) throw new Response("Campaign not found", { status: 404 });

    const invitesSnap = await adminDb.collection("invites").where("campaignId", "==", campaignId).get();
    const invites = invitesSnap.docs.map((doc) => doc.data());
    const inviteCount = invites.length;
    const completionCount = invites.filter((invite) => invite.status === "completed").length;
    const completionPercent = inviteCount > 0 ? (completionCount / inviteCount) * 100 : 0;

    if (inviteCount === 0 || completionPercent < org.thresholdPercent) {
      return NextResponse.json(
        {
          error: `This campaign needs ${org.thresholdPercent}% completion before report generation.`,
          completionCount,
          inviteCount,
        },
        { status: 409 }
      );
    }

    const reportRef = adminDb.collection("reports").doc(`${orgId}_${campaignId}`);
    await reportRef.set(
      buildReportDoc({
        org,
        campaign,
        invites,
        generatedBy: auth.uid,
      }),
      { merge: true }
    );

    const reportSnap = await reportRef.get();
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: impersonating ? "admin.impersonation.report.generate" : "org.report.generate",
      metadata: { campaignId, reportId: reportRef.id },
    });

    return NextResponse.json({ report: reportFromDoc(reportSnap.id, reportSnap.data() ?? {}) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
