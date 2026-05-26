import { NextResponse } from "next/server";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";
import { getCampaignInvites, getCampaignOrThrow } from "@/lib/serverOrgData";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await params;
    const url = new URL(request.url);
    const { auth, orgId, impersonating } = await resolveAccessibleOrgId(
      request,
      url.searchParams.get("orgId")
    );
    const campaign = await getCampaignOrThrow(campaignId);
    if (campaign.orgId !== orgId) throw new Response("Campaign not found", { status: 404 });

    const invites = await getCampaignInvites(campaignId);
    const canSeeTechnicalDetails = auth.superAdmin && impersonating;
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${url.protocol}//${request.headers.get("host") ?? "localhost:3000"}`;

    return NextResponse.json({
      invites: invites.map((invite) =>
        canSeeTechnicalDetails
          ? {
              ...invite,
              link: `${baseUrl}/assess?token=${invite.token}`,
            }
          : {
              id: invite.id,
              email: invite.email,
              status: invite.status,
            }
      ),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
