import { NextResponse } from "next/server";
import { resolveAccessibleOrgId, toErrorResponse } from "@/lib/serverAuth";
import { getCampaignInvites, getCampaignOrThrow } from "@/lib/serverOrgData";
import { getServerBaseUrl } from "@/lib/serverBaseUrl";

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
    const baseUrl = getServerBaseUrl(request);

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
              token: invite.token,
              link: `${baseUrl}/assess?token=${invite.token}`,
            }
      ),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
