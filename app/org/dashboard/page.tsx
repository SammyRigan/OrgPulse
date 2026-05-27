"use client";

import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  Component,
  Copy,
  Download,
  FileText,
  LogOut,
  Megaphone,
  Plus,
  Printer,
  Settings,
  ShieldAlert,
  Target,
  Zap,
} from "lucide-react";
import ExecutiveHeader from "@/components/ExecutiveHeader";
import PillarCard from "@/components/PillarCard";
import StabilityBar from "@/components/StabilityBar";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { getRadarData, type Scores } from "@/lib/utils";

const RadarChart = dynamic(() => import("@/components/RadarChart"), { ssr: false });

type Organization = {
  id: string;
  name: string;
  description?: string;
  size?: string;
  annualTurnover?: string;
  industry?: string;
  industryOther?: string;
  thresholdPercent: number;
  useDefaultQuestions: boolean;
};

type Campaign = {
  id: string;
  orgId: string;
  name: string;
  status: "draft" | "active" | "closed";
  passcode?: string;
  createdAt?: string;
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

type Report = {
  id: string;
  orgId: string;
  campaignId: string;
  campaignName: string;
  orgName: string;
  scores: Scores;
  averageScore: number;
  stabilityLabel: string;
  stabilityHeaderLabel: string;
  completionCount: number;
  inviteCount: number;
  thresholdPercent: number;
  qualitativeResponses: { question: string; answer: string; scoreKey?: string; variableKey?: string }[];
  contextVariables: { variableKey: string; question: string; averageScore: number; count: number }[];
  validationSignals: { variableKey: string; question: string; averageScore: number; count: number }[];
  generatedAt?: string;
};

type Section = "profile" | "campaigns" | "analysis";

const INDUSTRY_OPTIONS = [
  "Agriculture",
  "Construction",
  "Education",
  "Energy",
  "Finance",
  "Government / Public sector",
  "Healthcare",
  "Hospitality",
  "Manufacturing",
  "Non-profit",
  "Retail",
  "Technology",
  "Telecommunications",
  "Transportation & Logistics",
  "Other",
] as const;

const ORG_SIZE_OPTIONS = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1,000",
  "1,001–5,000",
  "5,000+",
] as const;

const ANNUAL_TURNOVER_OPTIONS = [
  "Prefer not to say",
  "< $100k",
  "$100k – $500k",
  "$500k – $1M",
  "$1M – $5M",
  "$5M – $20M",
  "$20M+",
] as const;

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
    </div>
  );
}

function OrgDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedOrgId = searchParams.get("orgId");
  const requestedImpersonation = searchParams.get("impersonating") === "1";
  const { user, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [impersonating, setImpersonating] = useState(false);
  const [actorEmail, setActorEmail] = useState<string | undefined>();
  const [section, setSection] = useState<Section>("profile");
  const [profileName, setProfileName] = useState("");
  const [profileThreshold, setProfileThreshold] = useState(80);
  const [profileDescription, setProfileDescription] = useState("");
  const [profileSize, setProfileSize] = useState("");
  const [profileAnnualTurnover, setProfileAnnualTurnover] = useState("");
  const [profileIndustry, setProfileIndustry] = useState("");
  const [profileIndustryOther, setProfileIndustryOther] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignPasscode, setNewCampaignPasscode] = useState("");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState("");
  const [addingInvites, setAddingInvites] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [invitesRefreshKey, setInvitesRefreshKey] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [orgLoadError, setOrgLoadError] = useState("");

  const authedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!user) throw new Error("Not signed in");
      const token = await user.getIdToken();
      return fetch(input, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });
    },
    [user]
  );

  const loadContext = useCallback(async () => {
    if (!user) return;
    const params = requestedOrgId ? `?orgId=${encodeURIComponent(requestedOrgId)}` : "";
    const response = await authedFetch(`/api/org/context${params}`);
    if (!response.ok) throw new Error(await response.text());
    const data = (await response.json()) as {
      org: Organization;
      campaigns: Campaign[];
      reports: Report[];
      impersonating: boolean;
      actorEmail?: string;
    };
    setOrg(data.org);
    setCampaigns(data.campaigns);
    setReports(data.reports);
    setImpersonating(data.impersonating);
    setActorEmail(data.actorEmail);
    setProfileName(data.org.name);
    setProfileThreshold(data.org.thresholdPercent);
    setProfileDescription(data.org.description ?? "");
    setProfileSize(data.org.size ?? "");
    setProfileAnnualTurnover(data.org.annualTurnover ?? "");
    setProfileIndustry(data.org.industry ?? "");
    setProfileIndustryOther(data.org.industryOther ?? "");
  }, [authedFetch, requestedOrgId, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/org");
      return;
    }
    if (!user) return;

    setOrgLoadError("");
    loadContext().catch((error) => {
      console.error(error);
      setOrgLoadError("Failed to load organization.");
    });
  }, [authLoading, loadContext, router, user]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/org");
  };

  const handleExitImpersonation = async () => {
    if (requestedOrgId) {
      await authedFetch("/api/admin/impersonation", {
        method: "POST",
        body: JSON.stringify({ orgId: requestedOrgId, action: "end" }),
      }).catch(() => undefined);
    }
    router.replace("/admin");
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!org) return;
    setProfileSaving(true);
    try {
      const response = await authedFetch("/api/org/context", {
        method: "PATCH",
        body: JSON.stringify({
          orgId: org.id,
          name: profileName.trim(),
          description: profileDescription.trim(),
          size: profileSize,
          annualTurnover: profileAnnualTurnover,
          industry: profileIndustry,
          industryOther: profileIndustry === "Other" ? profileIndustryOther.trim() : "",
          thresholdPercent: profileThreshold,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      await loadContext();
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!org || !newCampaignName.trim()) return;
    setCreatingCampaign(true);
    try {
      const response = await authedFetch("/api/org/campaigns", {
        method: "POST",
        body: JSON.stringify({
          orgId: org.id,
          name: newCampaignName.trim(),
          passcode: newCampaignPasscode.trim() || undefined,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { campaign: Campaign };
      setCampaigns((prev) => [data.campaign, ...prev]);
      setNewCampaignName("");
      setNewCampaignPasscode("");
      setExpandedCampaign(data.campaign.id);
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleAddInvites = async (campaignId: string) => {
    if (!org) return;
    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (!emails.length) return;

    setAddingInvites(campaignId);
    try {
      const response = await authedFetch("/api/org/invites", {
        method: "POST",
        body: JSON.stringify({ orgId: org.id, campaignId, emails }),
      });
      if (!response.ok) throw new Error(await response.text());
      setInviteEmails("");
      setExpandedCampaign(campaignId);
      setInvitesRefreshKey((key) => key + 1);
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
          <h2 className="text-lg font-semibold text-gray-900">{orgLoadError}</h2>
          <p className="mt-2 text-gray-500">Please try again or sign out and sign back in.</p>
          <button
            onClick={() => loadContext()}
            className="mt-4 rounded-lg bg-[#D97706] px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Retry
          </button>
          <button
            onClick={impersonating ? handleExitImpersonation : handleSignOut}
            className="ml-2 mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {impersonating ? "Exit workspace" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  if (authLoading || !org) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {impersonating && requestedImpersonation && (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              <span>
                Super admin {actorEmail ?? "session"} is inside {org.name}. Actions are audited.
              </span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="rounded-lg border border-amber-300 px-3 py-1.5 font-medium hover:bg-amber-100"
            >
              Exit organization
            </button>
          </div>
        </div>
      )}

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">
            OrgPulse <span className="text-[#D97706]">Dashboard</span>
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{org.name}</span>
            {!impersonating && (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1">
            <NavButton active={section === "profile"} onClick={() => setSection("profile")}>
              <Settings className="h-4 w-4" />
              Profile
            </NavButton>
            <NavButton active={section === "campaigns"} onClick={() => setSection("campaigns")}>
              <Megaphone className="h-4 w-4" />
              Send Invites
            </NavButton>
            <NavButton active={section === "analysis"} onClick={() => setSection("analysis")}>
              <BarChart3 className="h-4 w-4" />
              Analysis & Reports
            </NavButton>
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
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={profileDescription}
                  onChange={(event) => setProfileDescription(event.target.value)}
                  rows={3}
                  placeholder="What does your organization do?"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Organization size
                  </label>
                  <select
                    value={profileSize}
                    onChange={(event) => setProfileSize(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  >
                    <option value="">Select…</option>
                    {ORG_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Annual turnover
                  </label>
                  <select
                    value={profileAnnualTurnover}
                    onChange={(event) => setProfileAnnualTurnover(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  >
                    <option value="">Select…</option>
                    {ANNUAL_TURNOVER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Industry
                </label>
                <select
                  value={profileIndustry}
                  onChange={(event) => setProfileIndustry(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                >
                  <option value="">Select…</option>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              {profileIndustry === "Other" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Industry (Other)
                  </label>
                  <input
                    type="text"
                    value={profileIndustryOther}
                    onChange={(event) => setProfileIndustryOther(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Completion threshold (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={profileThreshold}
                  onChange={(event) => setProfileThreshold(parseInt(event.target.value, 10) || 80)}
                  className="w-24 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Analysis can be generated once this percentage of invitees completes the assessment.
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
                  onChange={(event) => setNewCampaignName(event.target.value)}
                  placeholder="Campaign name (e.g. Q1 Pulse)"
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
                <input
                  type="text"
                  value={newCampaignPasscode}
                  onChange={(event) => setNewCampaignPasscode(event.target.value)}
                  placeholder="Passcode (optional)"
                  className="w-48 rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                />
              </div>
              <button
                type="submit"
                disabled={creatingCampaign || !newCampaignName.trim()}
                className="flex items-center gap-2 rounded-lg bg-[#D97706] px-5 py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {creatingCampaign ? "Creating..." : "Create campaign"}
              </button>
            </form>

            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  orgId={org.id}
                  authedFetch={authedFetch}
                  invitesRefreshKey={invitesRefreshKey}
                  expanded={expandedCampaign === campaign.id}
                  onToggle={() =>
                    setExpandedCampaign((prev) => (prev === campaign.id ? null : campaign.id))
                  }
                  inviteEmails={inviteEmails}
                  setInviteEmails={setInviteEmails}
                  onAddInvites={() => handleAddInvites(campaign.id)}
                  addingInvites={addingInvites === campaign.id}
                  copiedLink={copiedLink}
                  onCopyLink={copyLink}
                  showTechnicalDetails={impersonating}
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
            reports={reports}
            selectedReport={selectedReport}
            setSelectedReport={setSelectedReport}
            authedFetch={authedFetch}
            onReportsChanged={loadContext}
          />
        )}
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
        active
          ? "border-[#D97706] text-[#D97706]"
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function CampaignCard({
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

  useEffect(() => {
    if (!expanded) return;
    authedFetch(`/api/org/campaigns/${campaign.id}/invites?orgId=${encodeURIComponent(orgId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ invites: Invite[] }>;
      })
      .then((data) => setInvites(data.invites))
      .catch((error) => console.error(error));
  }, [authedFetch, campaign.id, expanded, invitesRefreshKey, orgId]);

  const completed = invites.filter((invite) => invite.status === "completed").length;
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
                onChange={(event) => setInviteEmails(event.target.value)}
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
              {addingInvites ? "Sending..." : "Send invites"}
            </button>
          </div>
          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                {showTechnicalDetails ? "Invite delivery" : "Invitees"}
              </p>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
                {invites.map((invite) => {
                  const link =
                    invite.link ??
                    (invite.token ? `${window.location.origin}/assess?token=${invite.token}` : "");
                  const isCopied = copiedLink === link;
                  return (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between gap-2 rounded bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="block truncate text-sm text-gray-700">{invite.email}</span>
                        {showTechnicalDetails && invite.lastEmailError && (
                          <span className="block truncate text-xs text-red-600">
                            {invite.lastEmailError}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`text-xs ${
                            invite.status === "completed" ? "text-green-600" : "text-amber-600"
                          }`}
                        >
                          {invite.status}
                        </span>
                        {showTechnicalDetails && (
                          <>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {invite.emailStatus ?? "pending"}
                            </span>
                            {link && (
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
                            )}
                          </>
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
    </div>
  );
}

function AnalysisSection({
  org,
  campaigns,
  reports,
  selectedReport,
  setSelectedReport,
  authedFetch,
  onReportsChanged,
}: {
  org: Organization;
  campaigns: Campaign[];
  reports: Report[];
  selectedReport: Report | null;
  setSelectedReport: (report: Report | null) => void;
  authedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onReportsChanged: () => Promise<void>;
}) {
  const [completionRows, setCompletionRows] = useState<
    { campaign: Campaign; completed: number; total: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [generatingCampaignId, setGeneratingCampaignId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadCompletion() {
      setLoading(true);
      const rows = [];
      for (const campaign of campaigns) {
        const response = await authedFetch(
          `/api/org/campaigns/${campaign.id}/invites?orgId=${encodeURIComponent(org.id)}`
        );
        if (!response.ok) continue;
        const data = (await response.json()) as { invites: Invite[] };
        rows.push({
          campaign,
          total: data.invites.length,
          completed: data.invites.filter((invite) => invite.status === "completed").length,
        });
      }
      if (!cancelled) {
        setCompletionRows(rows);
        setLoading(false);
      }
    }
    loadCompletion().catch((loadError) => {
      console.error(loadError);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [authedFetch, campaigns, org.id]);

  const generateReport = async (campaign: Campaign) => {
    setError("");
    setGeneratingCampaignId(campaign.id);
    try {
      const response = await authedFetch("/api/org/reports", {
        method: "POST",
        body: JSON.stringify({ orgId: org.id, campaignId: campaign.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? (await response.text()));
      }
      const data = (await response.json()) as { report: Report };
      await onReportsChanged();
      setSelectedReport(data.report);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Could not generate report.");
    } finally {
      setGeneratingCampaignId(null);
    }
  };

  if (selectedReport) {
    return <ReportView report={selectedReport} onBack={() => setSelectedReport(null)} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Analysis & Reports</h2>
        <p className="mt-1 text-gray-600">
          Generate reports once a campaign reaches {org.thresholdPercent}% completion.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {reports.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Generated reports</h3>
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => setSelectedReport(report)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 text-left shadow-sm transition-colors hover:border-[#D97706] hover:bg-amber-50/50"
            >
              <span className="flex items-center gap-2 font-semibold text-gray-900">
                <FileText className="h-4 w-4 text-[#D97706]" />
                {report.campaignName}
              </span>
              <span className="text-sm text-gray-500">
                {report.completionCount}/{report.inviteCount} completed · {report.averageScore}%
                average
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Campaign eligibility</h3>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
          </div>
        ) : completionRows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
            No campaigns yet. Create a campaign and send invites first.
          </p>
        ) : (
          completionRows.map(({ campaign, completed, total }) => {
            const eligible = total > 0 && (completed / total) * 100 >= org.thresholdPercent;
            return (
              <div
                key={campaign.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-gray-900">{campaign.name}</p>
                  <p className="text-sm text-gray-500">
                    {completed}/{total} completed
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => generateReport(campaign)}
                  disabled={!eligible || generatingCampaignId === campaign.id}
                  className="rounded-lg bg-[#D97706] px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {generatingCampaignId === campaign.id ? "Generating..." : "Generate report"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ReportView({ report, onBack }: { report: Report; onBack: () => void }) {
  const noop = () => {};
  const radarData = getRadarData(report.scores);
  const stabilityColor =
    report.averageScore >= 75 ? "#10B981" : report.averageScore >= 50 ? "#F59E0B" : "#EF4444";

  const downloadCsv = () => {
    const rows = [
      ["Metric", "Score"],
      ["Vision", report.scores.vision],
      ["Alignment", report.scores.alignment],
      ["Performance", report.scores.performance],
      ["Cohesion", report.scores.cohesion],
      ["Processes", report.scores.processes],
      ["Scalability", report.scores.scalability],
      ["Average", report.averageScore],
      ["Completed", report.completionCount],
      ["Invited", report.inviteCount],
      ...report.contextVariables.map((item) => [
        "Context Variable",
        item.variableKey,
        `"${item.question.replace(/"/g, '""')}"`,
        item.averageScore,
        item.count,
      ]),
      ...report.validationSignals.map((item) => [
        "Validation Signal",
        item.variableKey,
        `"${item.question.replace(/"/g, '""')}"`,
        item.averageScore,
        item.count,
      ]),
      ...report.qualitativeResponses.map((response) => [
        "Qualitative",
        response.scoreKey ?? "",
        response.variableKey ?? "",
        `"${response.question.replace(/"/g, '""')}"`,
        `"${response.answer.replace(/"/g, '""').replace(/\n/g, " ")}"`,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.campaignName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm font-medium text-[#D97706] hover:underline">
          Back to reports
        </button>
        <div className="flex gap-2">
          <button
            onClick={downloadCsv}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900">{report.campaignName} report</h2>
        <p className="mb-6 text-sm text-gray-500">
          {report.orgName} · Based on {report.completionCount} completed responses from{" "}
          {report.inviteCount} invites
        </p>
        <ExecutiveHeader
          averageScore={report.averageScore}
          stabilityLabel={report.stabilityHeaderLabel}
          stabilityColor={stabilityColor}
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <PillarCard
              title="1. Vision & Alignment"
              icon={Target}
              inputs={[
                { id: "vision", label: "Vision Clarity", value: report.scores.vision, onChange: noop },
                {
                  id: "alignment",
                  label: "Strategic Alignment",
                  value: report.scores.alignment,
                  onChange: noop,
                },
              ]}
            />
            <PillarCard
              title="2. Team Performance"
              icon={Zap}
              inputs={[
                {
                  id: "performance",
                  label: "Execution Speed",
                  value: report.scores.performance,
                  onChange: noop,
                },
                { id: "cohesion", label: "Team Cohesion", value: report.scores.cohesion, onChange: noop },
              ]}
            />
            <PillarCard
              title="3. Systems & Structure"
              icon={Component}
              inputs={[
                {
                  id: "processes",
                  label: "Process Efficiency",
                  value: report.scores.processes,
                  onChange: noop,
                },
                { id: "scalability", label: "Scalability", value: report.scores.scalability, onChange: noop },
              ]}
            />
          </div>
          <div className="lg:col-span-7">
            <div className="relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-3xl bg-[#1A1A1A] p-10 text-white shadow-2xl">
              <div className="relative z-10 mb-8">
                <h2 className="mb-2 text-3xl font-bold">Health Profile Analysis</h2>
                <p className="text-sm text-gray-400">
                  Aggregate organizational health profile. Individual responses are not exposed.
                </p>
              </div>
              <div className="relative z-10 flex flex-1 items-center justify-center">
                <RadarChart data={radarData} />
              </div>
              <StabilityBar
                value={report.averageScore}
                label={report.stabilityLabel}
                barColor={stabilityColor}
              />
            </div>
          </div>
        </div>
        {(report.contextVariables.length > 0 || report.validationSignals.length > 0) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {report.contextVariables.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Context variables
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                  These explain the operating environment and do not change the core score.
                </p>
                <div className="space-y-3">
                  {report.contextVariables.map((item) => (
                    <div key={item.variableKey} className="rounded-xl bg-gray-50 p-4">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">{item.variableKey}</p>
                        <span className="text-sm font-bold text-[#D97706]">
                          {item.averageScore}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{item.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.validationSignals.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  Validation checks
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                  These help compare responses against other signals in the survey.
                </p>
                <div className="space-y-3">
                  {report.validationSignals.map((item) => (
                    <div key={item.variableKey} className="rounded-xl bg-gray-50 p-4">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">{item.variableKey}</p>
                        <span className="text-sm font-bold text-[#D97706]">
                          {item.averageScore}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{item.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {report.qualitativeResponses.length > 0 && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Qualitative context
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              Free-text responses are shown without employee names or emails.
            </p>
            <div className="space-y-4">
              {report.qualitativeResponses.map((response, index) => (
                <div key={index} className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {response.scoreKey ? `${response.scoreKey} pillar` : "qualitative"}
                    {response.variableKey ? ` · ${response.variableKey}` : ""}
                  </p>
                  <p className="mb-2 text-sm font-medium text-gray-800">{response.question}</p>
                  <p className="text-sm leading-relaxed text-gray-700">{response.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrgDashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <OrgDashboardContent />
    </Suspense>
  );
}
