import "server-only";

export type InviteEmailResult =
  | { status: "sent"; providerId?: string }
  | { status: "not_configured"; error: string }
  | { status: "failed"; error: string };

export async function sendInviteEmail({
  to,
  orgName,
  campaignName,
  link,
  passcode,
}: {
  to: string;
  orgName: string;
  campaignName: string;
  link: string;
  passcode?: string;
}): Promise<InviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      status: "not_configured",
      error: "Set RESEND_API_KEY and EMAIL_FROM to send invite emails.",
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `${orgName} invited you to complete ${campaignName}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h1 style="font-size:20px">Complete your organization health check</h1>
          <p>${orgName} invited you to complete the ${campaignName} assessment.</p>
          <p><a href="${link}" style="display:inline-block;background:#D97706;color:white;padding:10px 16px;border-radius:8px;text-decoration:none">Start assessment</a></p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#4B5563">${link}</p>
          ${
            passcode
              ? `<p>Your passcode is <strong>${passcode}</strong>.</p>`
              : ""
          }
          <p style="font-size:12px;color:#6B7280">Your responses are confidential and reported only in aggregate.</p>
        </div>
      `,
      text: [
        `${orgName} invited you to complete the ${campaignName} assessment.`,
        `Start assessment: ${link}`,
        passcode ? `Passcode: ${passcode}` : "",
        "Your responses are confidential and reported only in aggregate.",
      ]
        .filter(Boolean)
        .join("\n\n"),
    }),
  });

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  if (!response.ok) {
    return {
      status: "failed",
      error: body?.message ?? `Email provider returned ${response.status}.`,
    };
  }

  return { status: "sent", providerId: body?.id };
}
