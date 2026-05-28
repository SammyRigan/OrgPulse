"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import ReportView from "@/components/org-dashboard/ReportView";
import type { Campaign, Invite, Organization, Report } from "@/components/org-dashboard/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineAlert } from "@/components/ui/InlineAlert";

export default function AnalysisSection({
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
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadCompletion() {
      setLoadError("");
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
    loadCompletion().catch((loadErr) => {
      console.error(loadErr);
      if (!cancelled) {
        setLoadError("Could not load campaign eligibility. Please retry.");
        setLoading(false);
      }
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
        <h2 className="text-xl font-semibold text-foreground">Analysis & Reports</h2>
        <p className="mt-1 text-(--text-subtle)">
          Generate reports once a campaign reaches {org.thresholdPercent}% completion.
        </p>
      </div>

      {error && <InlineAlert tone="danger">{error}</InlineAlert>}

      {reports.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-(--text-muted)">Generated reports</h3>
          <div className="space-y-2">
            {reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReport(report)}
                className="flex w-full items-center justify-between rounded-[16px] border border-(--border) bg-(--surface) px-5 py-4 text-left shadow-(--shadow-sm) transition-colors hover:bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  <FileText className="h-4 w-4 text-(--accent)" />
                  {report.campaignName}
                </span>
                <span className="text-sm text-(--text-subtle)">
                  {report.completionCount}/{report.inviteCount} completed · {report.averageScore}% average
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-(--text-muted)">Campaign eligibility</h3>

        {loadError && (
          <InlineAlert tone="warning" className="flex items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={() => setLoading(true)}>
              Retry
            </Button>
          </InlineAlert>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-(--accent) border-t-transparent" />
          </div>
        ) : completionRows.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            description="Create a campaign and send invites first."
          />
        ) : (
          <div className="space-y-2">
            {completionRows.map(({ campaign, completed, total }) => {
              const eligible = total > 0 && (completed / total) * 100 >= org.thresholdPercent;
              return (
                <Card key={campaign.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="font-semibold text-foreground">{campaign.name}</p>
                    <p className="text-sm text-(--text-subtle)">
                      {completed}/{total} completed
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => generateReport(campaign)}
                    disabled={!eligible}
                    isLoading={generatingCampaignId === campaign.id}
                    size="sm"
                  >
                    Generate report
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

