import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getOrgOrThrow } from "@/lib/serverOrgData";
import { toErrorResponse } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const passcode = String(body.passcode ?? "").trim();
    if (!token) return new Response("Token is required", { status: 400 });

    const snap = await adminDb.collection("invites").where("token", "==", token).limit(1).get();
    if (snap.empty) return new Response("Invalid invite", { status: 404 });

    const invite = snap.docs[0].data();
    const expiresAt = invite.expiresAt?.toDate?.() as Date | undefined;
    if (invite.status === "completed" || !expiresAt || Date.now() > expiresAt.getTime()) {
      return new Response("Invalid invite", { status: 404 });
    }

    const org = await getOrgOrThrow(invite.orgId);
    if (invite.passcode && passcode !== invite.passcode) {
      return NextResponse.json({
        status: passcode ? "invalid_passcode" : "passcode_required",
        orgName: org.name,
      });
    }

    return NextResponse.json({ status: "ready", orgName: org.name });
  } catch (error) {
    return toErrorResponse(error);
  }
}
