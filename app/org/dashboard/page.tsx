"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Building2,
  Megaphone,
  Settings,
  LogOut,
  Copy,
  Check,
  Plus,
  ChevronDown,
  BarChart3,
  Target,
  Zap,
  Component,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import {
  getAverageScore,
  getStabilityState,
  getRadarData,
  type Scores,
} from "@/lib/utils";
import ExecutiveHeader from "@/components/ExecutiveHeader";
import StabilityBar from "@/components/StabilityBar";
import PillarCard from "@/components/PillarCard";
import {
  getOrganizationByAdminUid,
  updateOrganization,
  getCampaignsByOrgId,
  addCampaign,
  getInvitesByCampaign,
  addInvites,
  aggregateCampaignResponses,
  type Organization,
  type Campaign,
  type Invite,
} from "@/lib/firestore";

const RadarChart = dynamic(() => import("@/components/RadarChart"), { ssr: false });

export default function OrgDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [orgLoadError, setOrgLoadError] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [section, setSection] = useState<"profile" | "campaigns" | "analysis">("profile");
  const [profileName, setProfileName] = useState("");
  const [profileThreshold, setProfileThreshold] = useState(80);
  const [profileSaving, setProfileSaving] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignPasscode, setNewCampaignPasscode] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState("");
  const [addingInvites, setAddingInvites] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [invitesRefreshKey, setInvitesRefreshKey] = useState(0);
  const [analysisCampaign, setAnalysisCampaign] = useState<{
    campaign: Campaign;
    invites: Invite[];
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/org");
      return;
    }
    if (!user) return;
    setOrgLoadError(false);
    const run = async () => {
      try {
        await user.getIdToken(true);
        const o = await getOrganizationByAdminUid(user.uid);
        if (!o) router.replace("/org");
        else {
          setOrg(o);
          setProfileName(o.name);
          setProfileThreshold(o.thresholdPercent);
          getCampaignsByOrgId(o.id).then(setCampaigns);
        }
      } catch {
        setOrgLoadError(true);
      }
    };
    run();
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/org");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setProfileSaving(true);
    try {
      await updateOrganization(org.id, {
        name: profileName.trim(),
        thresholdPercent: profileThreshold,
      });
      setOrg((prev) =>
        prev ? { ...prev, name: profileName.trim(), thresholdPercent: profileThreshold } : null
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !newCampaignName.trim()) return;
    setCreatingCampaign(true);
    try {
      const passcode = newCampaignPasscode.trim() || undefined;
      const id = await addCampaign({ orgId: org.id, name: newCampaignName.trim(), passcode });
      setCampaigns((prev) => [
        { id, orgId: org.id, name: newCampaignName.trim(), status: "active", passcode, createdAt: new Date() },
        ...prev,
      ]);
      setNewCampaignName("");
      setNewCampaignPasscode("");
      setExpandedCampaign(id);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleAddInvites = async (campaignId: string, passcode?: string) => {
    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length || !org) return;
    setAddingInvites(campaignId);
    try {
      await addInvites(org.id, campaignId, emails, passcode);
      setInviteEmails("");
      setExpandedCampaign(campaignId);
      setInvitesRefreshKey((k) => k + 1);
    } finally {
      setAddingInvites(null);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (orgLoadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Failed to load organization</h2>
          <p className="mt-2 text-gray-500">
            Please try again or sign out and sign back in.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-[#D97706] px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Retry
          </button>
          <button
            onClick={handleSignOut}
            className="ml-2 mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || !org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            OrgPulse <span className="text-[#D97706]">Dashboard</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{org.name}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setSection("profile")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                section === "profile"
                  ? "border-[#D97706] text-[#D97706]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Settings className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setSection("campaigns")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                section === "campaigns"
                  ? "border-[#D97706] text-[#D97706]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <Megaphone className="h-4 w-4" />
              Send Invites
            </button>
            <button
              onClick={() => setSection("analysis")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                section === "analysis"
                  ? "border-[#D97706] text-[#D97706]"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Analysis
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {section === "profile" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Building2 className="h-5 w-5 text-[#D97706]" />
              Organization profile
            </h2>
            <form onSubmit={handleSaveProfile} className="max-w-md space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Organization name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Threshold %
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={profileThreshold}
                  onChange={(e) => setProfileThreshold(Number(e.target.value) || 80)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Health score below this is considered at risk
                </p>
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-lg bg-[#D97706] px-5 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save profile"}
              </button>
            </form>
          </div>
        )}

        {section === "campaigns" && (
          <div className="space-y-6">
            <form
              onSubmit={handleCreateCampaign}
              className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  placeholder="Campaign name (e.g. Q1 2025 Pulse)"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
                <input
                  type="text"
                  value={newCampaignPasscode}
                  onChange={(e) => setNewCampaignPasscode(e.target.value)}
                  placeholder="Passcode (optional)"
                  className="w-40 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={creatingCampaign || !newCampaignName.trim()}
                  className="flex items-center gap-2 rounded-lg bg-[#D97706] px-5 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {creatingCampaign ? "Creating..." : "Create campaign"}
                </button>
                <span className="text-sm text-gray-500">
                  Passcode protects access; leave blank for open access
                </span>
              </div>
            </form>

            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  orgId={org.id}
                  invitesRefreshKey={invitesRefreshKey}
                  expanded={expandedCampaign === campaign.id}
                  onToggle={() =>
                    setExpandedCampaign((prev) =>
                      prev === campaign.id ? null : campaign.id
                    )
                  }
                  inviteEmails={inviteEmails}
                  setInviteEmails={setInviteEmails}
                  onAddInvites={() => handleAddInvites(campaign.id, campaign.passcode)}
                  addingInvites={addingInvites === campaign.id}
                  copiedLink={copiedLink}
                  onCopyLink={copyLink}
                />
              ))}
              {campaigns.length === 0 && (
                <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
                  No campaigns yet. Create one to invite employees.
                </p>
              )}
            </div>
          </div>
        )}

        {section === "analysis" && (
          <AnalysisSection
            org={org}
            campaigns={campaigns}
            onSelectCampaign={async (campaign) => {
              const invites = await getInvitesByCampaign(campaign.id);
              setAnalysisCampaign({ campaign, invites });
            }}
            analysisCampaign={analysisCampaign}
            onBack={() => setAnalysisCampaign(null)}
          />
        )}
      </main>
    </div>
  );
}

function AnalysisSection({
  org,
  campaigns,
  onSelectCampaign,
  analysisCampaign,
  onBack,
}: {
  org: Organization;
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  analysisCampaign: { campaign: Campaign; invites: Invite[] } | null;
  onBack: () => void;
}) {
  const [eligible, setEligible] = useState<
    { campaign: Campaign; completed: number; total: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (campaigns.length === 0) {
      setEligible([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      const result: { campaign: Campaign; completed: number; total: number }[] = [];
      for (const campaign of campaigns) {
        const invites = await getInvitesByCampaign(campaign.id);
        const total = invites.length;
        const completed = invites.filter((i) => i.status === "completed").length;
        const pct = total > 0 ? (completed / total) * 100 : 0;
        if (total > 0 && pct >= org.thresholdPercent && !cancelled) {
          result.push({ campaign, completed, total });
        }
      }
      if (!cancelled) setEligible(result);
      setLoading(false);
    };
    setLoading(true);
    run();
    return () => {
      cancelled = true;
    };
  }, [campaigns, org.thresholdPercent]);

  if (analysisCampaign) {
    const { campaign, invites } = analysisCampaign;
    const scores = aggregateCampaignResponses(invites) as Scores;
    const average = getAverageScore(scores);
    const stability = getStabilityState(average);
    const radarData = getRadarData(scores);
    const noop = () => {};

    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="text-sm font-medium text-[#D97706] hover:underline"
        >
          ← Back to campaigns
        </button>
        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            {campaign.name} – aggregated analysis
          </h2>
          <p className="mb-6 text-sm text-gray-500">
            Based on {invites.filter((i) => i.status === "completed").length}{" "}
            completed responses
          </p>
        <ExecutiveHeader
          averageScore={average}
          stabilityLabel={stability.headerLabel}
          stabilityColor={stability.barColor}
        />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-5">
              <PillarCard
                title="1. Vision & Alignment"
                icon={Target}
                inputs={[
                  { id: "vision", label: "Vision Clarity", value: scores.vision, onChange: noop },
                  { id: "alignment", label: "Strategic Alignment", value: scores.alignment, onChange: noop },
                ]}
              />
              <PillarCard
                title="2. Team Performance"
                icon={Zap}
                inputs={[
                  { id: "performance", label: "Execution Speed", value: scores.performance, onChange: noop },
                  { id: "cohesion", label: "Team Cohesion", value: scores.cohesion, onChange: noop },
                ]}
              />
              <PillarCard
                title="3. Systems & Structure"
                icon={Component}
                inputs={[
                  { id: "processes", label: "Process Efficiency", value: scores.processes, onChange: noop },
                  { id: "scalability", label: "Scalability", value: scores.scalability, onChange: noop },
                ]}
              />
            </div>
            <div className="lg:col-span-7">
              <div className="relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-3xl bg-[#1A1A1A] p-10 text-white shadow-2xl">
                <div className="relative z-10 mb-8">
                  <h2 className="mb-2 text-3xl font-bold">Health Profile Analysis</h2>
                  <p className="text-sm text-gray-400">
                    Aggregated visualization of organizational pillars
                  </p>
                </div>
                <div className="relative z-10 flex flex-1 items-center justify-center">
                  <RadarChart data={radarData} />
                </div>
                <StabilityBar
                  value={average}
                  label={stability.label}
                  barColor={stability.barColor}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Generate analysis for campaigns where enough invitees have completed the
        assessment (≥{org.thresholdPercent}% completion).
      </p>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
        </div>
      ) : eligible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
          No campaigns meet the threshold yet. Send invites and wait for enough
          responses.
        </p>
      ) : (
        <div className="space-y-3">
          {eligible.map(({ campaign, completed, total }) => (
            <button
              key={campaign.id}
              type="button"
              onClick={() => onSelectCampaign(campaign)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 text-left shadow-sm transition-colors hover:border-[#D97706] hover:bg-amber-50/50"
            >
              <span className="font-semibold text-gray-900">{campaign.name}</span>
              <span className="text-sm text-gray-500">
                {completed}/{total} completed – Generate analysis →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignCard({
  campaign,
  orgId,
  invitesRefreshKey,
  expanded,
  onToggle,
  inviteEmails,
  setInviteEmails,
  onAddInvites,
  addingInvites,
  copiedLink,
  onCopyLink,
}: {
  campaign: Campaign;
  orgId: string;
  invitesRefreshKey: number;
  expanded: boolean;
  onToggle: () => void;
  inviteEmails: string;
  setInviteEmails: (v: string) => void;
  onAddInvites: () => void;
  addingInvites: boolean;
  copiedLink: string | null;
  onCopyLink: (link: string) => void;
}) {
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    if (expanded) getInvitesByCampaign(campaign.id).then(setInvites);
  }, [campaign.id, expanded, invitesRefreshKey]);

  const completed = invites.filter((i) => i.status === "completed").length;
  const total = invites.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <Megaphone className="h-5 w-5 text-[#D97706]" />
          <div>
            <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
            <p className="text-sm text-gray-500">
              {completed}/{total} completed ({pct}%)
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-6 py-4">
          <div className="mb-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Add invite emails (one per line or comma-separated)
              </label>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="alice@company.com&#10;bob@company.com"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
            </div>
            <button
              type="button"
              onClick={onAddInvites}
              disabled={addingInvites || !inviteEmails.trim()}
              className="rounded-lg bg-[#D97706] px-4 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {addingInvites ? "Adding..." : "Add invites"}
            </button>
          </div>
          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Invite links</p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
                {invites.map((inv) => {
                  const link =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/assess?token=${inv.token}`
                      : "";
                  const isCopied = copiedLink === link;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-2 rounded bg-white px-3 py-2"
                    >
                      <span className="truncate text-sm text-gray-700">{inv.email}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs ${
                            inv.status === "completed" ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {inv.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => onCopyLink(link)}
                          className="flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {isCopied ? (
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
