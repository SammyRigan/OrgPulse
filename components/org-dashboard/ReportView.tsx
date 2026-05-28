"use client";

import {
  Component as ComponentIcon,
  Download,
  Printer,
  Target,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import ExecutiveHeader from "@/components/ExecutiveHeader";
import PillarCard from "@/components/PillarCard";
import StabilityBar from "@/components/StabilityBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Report } from "@/components/org-dashboard/types";
import { cn } from "@/lib/cn";
import { getRadarData } from "@/lib/utils";

const RadarChart = dynamic(() => import("@/components/RadarChart"), { ssr: false });

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export default function ReportView({ report, onBack }: { report: Report; onBack: () => void }) {
  const noop = () => {};
  const radarData = getRadarData(report.scores);

  const stabilityColor =
    report.averageScore >= 75 ? "var(--success)" : report.averageScore >= 50 ? "var(--warning)" : "var(--danger)";

  const downloadCsv = () => {
    const rows = [
      ["Metric", "Score"],
      ["Vision", String(report.scores.vision)],
      ["Alignment", String(report.scores.alignment)],
      ["Performance", String(report.scores.performance)],
      ["Cohesion", String(report.scores.cohesion)],
      ["Processes", String(report.scores.processes)],
      ["Scalability", String(report.scores.scalability)],
      ["Average", String(report.averageScore)],
      ["Completed", String(report.completionCount)],
      ["Invited", String(report.inviteCount)],
      ...report.contextVariables.map((item) => [
        "Context Variable",
        item.variableKey,
        csvValue(item.question),
        String(item.averageScore),
        String(item.count),
      ]),
      ...report.validationSignals.map((item) => [
        "Validation Signal",
        item.variableKey,
        csvValue(item.question),
        String(item.averageScore),
        String(item.count),
      ]),
      ...report.qualitativeResponses.map((response) => [
        "Qualitative",
        response.scoreKey ?? "",
        response.variableKey ?? "",
        csvValue(response.question),
        csvValue(response.answer.replace(/\n/g, " ")),
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
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-(--accent) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Back to reports
        </button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">{report.campaignName} report</h2>
        <p className="mb-6 text-sm text-(--text-subtle)">
          {report.orgName} · Based on {report.completionCount} completed responses from {report.inviteCount} invites
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
                { id: "alignment", label: "Strategic Alignment", value: report.scores.alignment, onChange: noop },
              ]}
            />
            <PillarCard
              title="2. Team Performance"
              icon={Zap}
              inputs={[
                { id: "performance", label: "Execution Speed", value: report.scores.performance, onChange: noop },
                { id: "cohesion", label: "Team Cohesion", value: report.scores.cohesion, onChange: noop },
              ]}
            />
            <PillarCard
              title="3. Systems & Structure"
              icon={ComponentIcon}
              inputs={[
                { id: "processes", label: "Process Efficiency", value: report.scores.processes, onChange: noop },
                { id: "scalability", label: "Scalability", value: report.scores.scalability, onChange: noop },
              ]}
            />
          </div>

          <Card className="lg:col-span-7">
            <div className="relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-[18px] bg-[color-mix(in_oklab,var(--surface)_22%,black)] p-10 text-white shadow-(--shadow-md)">
              <div className="relative z-10 mb-8">
                <h2 className="mb-2 text-2xl font-semibold">Health Profile Analysis</h2>
                <p className="text-sm text-white/70">
                  Aggregate organizational health profile. Individual responses are not exposed.
                </p>
              </div>
              <div className="relative z-10 flex flex-1 items-center justify-center">
                <RadarChart data={radarData} />
              </div>
              <StabilityBar value={report.averageScore} label={report.stabilityLabel} barColor={stabilityColor} />
            </div>
          </Card>
        </div>

        {(report.contextVariables.length > 0 || report.validationSignals.length > 0) && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {report.contextVariables.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">Context variables</h3>
                <p className="mb-4 text-sm text-(--text-subtle)">
                  These explain the operating environment and do not change the core score.
                </p>
                <div className="space-y-3">
                  {report.contextVariables.map((item) => (
                    <div
                      key={item.variableKey}
                      className="rounded-[14px] border border-(--border) bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))] p-4"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.variableKey}</p>
                        <span className="text-sm font-bold text-(--accent)">{item.averageScore}%</span>
                      </div>
                      <p className="text-xs text-(--text-subtle)">{item.question}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {report.validationSignals.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">Validation checks</h3>
                <p className="mb-4 text-sm text-(--text-subtle)">
                  These help compare responses against other signals in the survey.
                </p>
                <div className="space-y-3">
                  {report.validationSignals.map((item) => (
                    <div
                      key={item.variableKey}
                      className="rounded-[14px] border border-(--border) bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))] p-4"
                    >
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.variableKey}</p>
                        <span className="text-sm font-bold text-(--accent)">{item.averageScore}%</span>
                      </div>
                      <p className="text-xs text-(--text-subtle)">{item.question}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {report.qualitativeResponses.length > 0 && (
          <Card className="mt-8 p-6">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Qualitative context</h3>
            <p className="mb-4 text-sm text-(--text-subtle)">
              Free-text responses are shown without employee names or emails.
            </p>

            <div className="space-y-4">
              {report.qualitativeResponses.map((response, index) => (
                <div
                  key={index}
                  className="rounded-[14px] border border-(--border) bg-[color-mix(in_oklab,var(--surface)_88%,var(--bg))] p-4"
                >
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/55">
                    {response.scoreKey ? `${response.scoreKey} pillar` : "qualitative"}
                    {response.variableKey ? ` · ${response.variableKey}` : ""}
                  </p>
                  <p className={cn("mb-2 text-sm font-semibold text-foreground")}>{response.question}</p>
                  <p className="text-sm leading-relaxed text-(--text-muted)">{response.answer}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

