 "use client";
 
 import { Check, ChevronDown, Copy, Megaphone } from "lucide-react";
 import { useEffect, useMemo, useState } from "react";
 import { Button } from "@/components/ui/Button";
 import { Card } from "@/components/ui/Card";
 import { InlineAlert } from "@/components/ui/InlineAlert";
 import { Label, Textarea } from "@/components/ui/Field";
 import { cn } from "@/lib/cn";
 
 type Campaign = {
   id: string;
   name: string;
 };
 
 type Invite = {
   id: string;
   email: string;
   token?: string;
   link?: string;
   status: "pending" | "completed";
   emailStatus?: "pending" | "sent" | "failed" | "not_configured";
   lastEmailError?: string;
 };
 
 export default function CampaignCard({
   campaign,
   orgId,
   authedFetch,
   invitesRefreshKey,
   expanded,
   onToggle,
   inviteEmails,
   setInviteEmails,
   onAddInvites,
   addingInvites,
   copiedLink,
   onCopyLink,
   showTechnicalDetails,
 }: {
   campaign: Campaign;
   orgId: string;
   authedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
   invitesRefreshKey: number;
   expanded: boolean;
   onToggle: () => void;
   inviteEmails: string;
   setInviteEmails: (value: string) => void;
   onAddInvites: () => void;
   addingInvites: boolean;
   copiedLink: string | null;
   onCopyLink: (link: string) => void;
   showTechnicalDetails: boolean;
 }) {
   const [invites, setInvites] = useState<Invite[]>([]);
   const [invitesError, setInvitesError] = useState("");
  const [resolvingInviteId, setResolvingInviteId] = useState<string | null>(null);
 
   useEffect(() => {
     if (!expanded) return;
     authedFetch(`/api/org/campaigns/${campaign.id}/invites?orgId=${encodeURIComponent(orgId)}`)
       .then(async (response) => {
         if (!response.ok) throw new Error(await response.text());
         return response.json() as Promise<{ invites: Invite[] }>;
       })
      .then((data) => {
        setInvitesError("");
        setInvites(data.invites);
      })
       .catch((error) => {
         console.error(error);
         setInvitesError("Could not load invitees. Please try again.");
       });
   }, [authedFetch, campaign.id, expanded, invitesRefreshKey, orgId]);
 
   const stats = useMemo(() => {
     const completed = invites.filter((invite) => invite.status === "completed").length;
     const total = invites.length;
     const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
     return { completed, total, pct };
   }, [invites]);
 
   const inviteEmailsId = `invite-emails-${campaign.id}`;

  const resolveInviteLink = (invite: Invite) =>
    typeof invite.link === "string" && invite.link.trim()
      ? invite.link.trim()
      : invite.token
        ? `${window.location.origin}/assess?token=${invite.token}`
        : "";

  const handleCopyInviteLink = async (invite: Invite) => {
    const resolved = resolveInviteLink(invite);
    if (resolved) {
      onCopyLink(resolved);
      return;
    }

    setResolvingInviteId(invite.id);
    try {
      const response = await authedFetch(
        `/api/org/invites/${invite.id}/link?orgId=${encodeURIComponent(orgId)}`
      );
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { link?: string };
      if (!data.link) throw new Error("No link available");
      onCopyLink(data.link);
    } catch (error) {
      console.error(error);
      setInvitesError("Could not generate invite link. Please try again.");
    } finally {
      setResolvingInviteId(null);
    }
  };
 
   return (
     <Card className="overflow-hidden">
       <button
         type="button"
         onClick={onToggle}
         className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
       >
         <div className="flex items-center gap-3">
           <Megaphone className="h-5 w-5 text-(--accent)" />
           <div>
             <h3 className="font-semibold text-foreground">{campaign.name}</h3>
             <p className="text-sm text-(--text-subtle)">
               {stats.completed}/{stats.total} completed ({stats.pct}%)
             </p>
           </div>
         </div>
         <ChevronDown
           className={cn(
             "h-5 w-5 text-(--text-subtle) transition-transform",
             expanded ? "rotate-180" : ""
           )}
         />
       </button>
 
       {expanded && (
         <div className="border-t border-(--border) px-6 py-4">
           {invitesError && <InlineAlert tone="danger" className="mb-4">{invitesError}</InlineAlert>}
 
           <div className="mb-4 flex items-end gap-3">
             <div className="flex-1">
               <Label htmlFor={inviteEmailsId}>Add invite emails (one per line or comma-separated)</Label>
               <Textarea
                 id={inviteEmailsId}
                 value={inviteEmails}
                 onChange={(event) => setInviteEmails(event.target.value)}
                 placeholder={"alice@company.com\nbob@company.com"}
                 rows={3}
               />
             </div>
             <Button
               type="button"
               onClick={onAddInvites}
               isLoading={addingInvites}
               disabled={!inviteEmails.trim()}
             >
               Send invites
             </Button>
           </div>
 
           {invites.length > 0 && (
             <div className="space-y-2">
               <p className="text-sm font-semibold text-(--text-muted)">
                 {showTechnicalDetails ? "Invite delivery" : "Invitees"}
               </p>
               <div className="max-h-56 space-y-2 overflow-y-auto rounded-[14px] border border-(--border) bg-[color-mix(in_oklab,var(--surface)_86%,var(--bg))] p-3">
                 {invites.map((invite) => {
                  const link = resolveInviteLink(invite);
                   const isCopied = copiedLink === link;
                  const isResolving = resolvingInviteId === invite.id;
 
                   return (
                     <div
                       key={invite.id}
                       className="flex items-center justify-between gap-2 rounded-[12px] bg-(--surface) px-3 py-2 shadow-(--shadow-sm)"
                     >
                       <div className="min-w-0">
                         <span className="block truncate text-sm text-(--text-muted)">{invite.email}</span>
                         {showTechnicalDetails && invite.lastEmailError && (
                           <span className="block truncate text-xs text-(--danger)">
                             {invite.lastEmailError}
                           </span>
                         )}
                       </div>
 
                       <div className="flex shrink-0 items-center gap-2">
                         <span
                           className={cn(
                             "text-xs font-semibold",
                             invite.status === "completed" ? "text-(--success)" : "text-(--warning)"
                           )}
                         >
                           {invite.status}
                         </span>
                        <button
                          type="button"
                          onClick={() => handleCopyInviteLink(invite)}
                          disabled={isResolving}
                          className="flex items-center gap-1 rounded-[10px] border border-(--border) bg-(--surface) px-2 py-1 text-xs font-semibold text-(--text-muted) transition-colors hover:bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))] disabled:opacity-50"
                        >
                          {isResolving ? (
                            "Loading..."
                          ) : isCopied ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy link
                            </>
                          )}
                        </button>
                         {showTechnicalDetails && (
                           <span className="rounded-[10px] bg-[color-mix(in_oklab,var(--surface)_82%,var(--bg))] px-2 py-0.5 text-xs text-(--text-subtle)">
                             {invite.emailStatus ?? "pending"}
                           </span>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}
         </div>
       )}
     </Card>
   );
 }
 
