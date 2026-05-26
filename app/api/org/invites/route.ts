import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { sendInviteEmail } from "@/lib/email";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";
import {
  generateToken,
  getCampaignOrThrow,
  getOrgOrThrow,
  inviteFromDoc,
  normalizeEmails,
  writeAuditLog,
} from "@/lib/serverOrgData";

async function getInviteExpiryDays(): Promise<number> {
  const snap = await adminDb.collection("adminSettings").doc("main").get();
  return snap.get("inviteExpiryDays") ?? 10;
}

function getBaseUrl(request: Request): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    `${new URL(request.url).protocol}//${request.headers.get("host") ?? "localhost:3000"}`
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(request, body.orgId);
    const campaignId = String(body.campaignId ?? "");
    const emails = normalizeEmails(body.emails);

    if (!campaignId) return new Response("Campaign id is required", { status: 400 });
    if (!emails.length) return new Response("At least one valid email is required", { status: 400 });

    const [org, campaign, expiryDays] = await Promise.all([
      getOrgOrThrow(orgId),
      getCampaignOrThrow(campaignId),
      getInviteExpiryDays(),
    ]);
    if (campaign.orgId !== orgId) throw new Response("Campaign not found", { status: 404 });

    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
    );
    const baseUrl = getBaseUrl(request);
    const invites = [];

    for (const email of emails) {
      const token = generateToken();
      const link = `${baseUrl}/assess?token=${token}`;
      const docRef = await adminDb.collection("invites").add({
        orgId,
        campaignId,
        email,
        token,
        status: "pending",
        emailStatus: "pending",
        expiresAt,
        ...(campaign.passcode ? { passcode: campaign.passcode } : {}),
        createdAt: FieldValue.serverTimestamp(),
      });

      const emailResult = await sendInviteEmail({
        to: email,
        orgName: org.name,
        campaignName: campaign.name,
        link,
        passcode: campaign.passcode,
      });

      await docRef.update({
        emailStatus: emailResult.status,
        ...(emailResult.status === "sent"
          ? { sentAt: FieldValue.serverTimestamp(), emailProviderId: emailResult.providerId ?? null }
          : { lastEmailError: emailResult.error }),
      });

      const snap = await docRef.get();
      invites.push({ ...inviteFromDoc(snap.id, snap.data() ?? {}), link });
    }

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      orgId,
      action: impersonating ? "admin.impersonation.invites.create" : "org.invites.create",
      metadata: { campaignId, inviteCount: invites.length },
    });

    return NextResponse.json({ invites }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
