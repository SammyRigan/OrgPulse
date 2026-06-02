"use client";

import {
  AlertTriangle,
  BarChart3,
  Component as ComponentIcon,
  Download,
  FileText,
  Globe,
  Info,
  Printer,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import ExecutiveHeader from "@/components/ExecutiveHeader";
import PillarCard from "@/components/PillarCard";
import StabilityBar from "@/components/StabilityBar";
import type { Report } from "@/components/org-dashboard/types";
import { Button } from "@/components/ui/Button";
import {
  buildContextModifiers,
  getCoreScores,
  getInfrastructureScore,
  getRiskStatus,
  getVolatilityScore,
  groupQualitativeResponses,
} from "@/lib/intelligenceReport";
import { getRadarData } from "@/lib/utils";

const RadarChart = dynamic(() => import("@/components/RadarChart"), { ssr: false });

type ReportTab = "health" | "intelligence";

function ReportTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
        active
          ? "border-[#D97706] text-[#D97706]"
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function ContextModifierBar({
  label,
  valueLabel,
  description,
  score,
}: {
  label: string;
  valueLabel: string;
  description: string;
  score: number;
}) {
  const isLow = score < 60;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
        <span className={`text-xs font-bold ${isLow ? "text-red-500" : "text-emerald-500"}`}>
          {score}% {valueLabel}
        </span>
      </div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full ${isLow ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-500">{description}</p>
    </div>
  );
}

export default function IntelligenceReportView({
  report,
  onBack,
}: {
  report: Report;
  onBack: () => void;
}) {
  const averageScore = report.averageScore;
  const riskStatus = getRiskStatus(averageScore);
  const scores = getCoreScores(report.scores);
  const contextModifiers = buildContextModifiers(report.contextVariables);
  const infrastructureScore = getInfrastructureScore(report.contextVariables);
  const volatilityScore = getVolatilityScore(report.contextVariables);
  const qualitativeGroups = groupQualitativeResponses(report.qualitativeResponses);
  const radarData = getRadarData(report.scores);
  const stabilityColor =
    averageScore >= 75 ? "#10B981" : averageScore >= 50 ? "#F59E0B" : "#EF4444";
  const noop = () => {};
  const [activeTab, setActiveTab] = useState<ReportTab>("health");

  const downloadCsv = () => {
    const rows = [
      ["Metric", "Score"],
      ["Vision Clarity", String(scores.visionClarity)],
      ["Strategic Alignment", String(scores.strategicAlignment)],
      ["Execution Speed", String(scores.executionSpeed)],
      ["Team Cohesion", String(scores.teamCohesion)],
      ["Process Efficiency", String(scores.processEfficiency)],
      ["Scalability", String(scores.scalability)],
      ["Aggregate Resilience Quotient", String(averageScore)],
      ["Completed", String(report.completionCount)],
      ["Invited", String(report.inviteCount)],
      ...contextModifiers.map((item) => ["Context Modifier", item.label, String(item.score)]),
      ...qualitativeGroups.flatMap((group) =>
        group.answers.map((answer) => ["Qualitative", csvValue(group.question), csvValue(answer)])
      ),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report.campaignName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-intelligence-report.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-semibold text-[#D97706] hover:underline"
        >
          Back to reports
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">{report.campaignName}</h2>
        <p className="mt-1 text-sm text-gray-500">
          {report.orgName} · {report.completionCount}/{report.inviteCount} completed responses
        </p>
      </div>

      <nav className="border-b border-gray-200">
        <div className="flex gap-1">
          <ReportTabButton active={activeTab === "health"} onClick={() => setActiveTab("health")}>
            <BarChart3 className="h-4 w-4" />
            Organization Health Diagram
          </ReportTabButton>
          <ReportTabButton
            active={activeTab === "intelligence"}
            onClick={() => setActiveTab("intelligence")}
          >
            <FileText className="h-4 w-4" />
            Intelligence Report
          </ReportTabButton>
        </div>
      </nav>

      {activeTab === "health" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Organization Health Diagram</h3>
            <p className="mt-1 text-sm text-gray-500">
              Six-axis structural profile aggregated from completed assessments. Individual responses
              are not exposed.
            </p>
          </div>

          <ExecutiveHeader
            averageScore={averageScore}
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
                icon={ComponentIcon}
                inputs={[
                  {
                    id: "processes",
                    label: "Process Efficiency",
                    value: report.scores.processes,
                    onChange: noop,
                  },
                  {
                    id: "scalability",
                    label: "Scalability",
                    value: report.scores.scalability,
                    onChange: noop,
                  },
                ]}
              />
            </div>

            <div className="lg:col-span-7">
              <div className="relative flex h-full min-h-[400px] flex-col overflow-hidden rounded-3xl bg-[#1A1A1A] p-10 text-white shadow-2xl">
                <div className="relative z-10 mb-8">
                  <h2 className="mb-2 text-3xl font-bold">Health Profile Analysis</h2>
                  <p className="text-sm text-gray-400">
                    Aggregate organizational health profile across all six diagnostic pillars.
                  </p>
                </div>
                <div className="relative z-10 flex flex-1 items-center justify-center">
                  <RadarChart data={radarData} />
                </div>
                <StabilityBar
                  value={averageScore}
                  label={report.stabilityLabel}
                  barColor={stabilityColor}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "intelligence" && (
        <div className="space-y-8">
          <div>
            <h3 className="text-3xl font-extrabold text-gray-900">Executive Intelligence Report</h3>
            <p className="mt-1 text-sm text-gray-500">
              Context-aware strategic analysis derived from survey responses for {report.orgName}.
            </p>
          </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gray-900 p-8 text-white shadow-lg">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div>
            <span className="mb-2 block text-xs font-bold tracking-widest text-gray-400 uppercase">
              Aggregate Resilience Quotient
            </span>
            <div className="mb-2 flex items-end gap-3">
              <h3 className="text-6xl font-black text-white">{averageScore}%</h3>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                averageScore >= 75
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-400"
              }`}
            >
              <ShieldCheck className="h-4 w-4" /> {riskStatus.badge}
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-6">
            <p className="text-sm leading-relaxed text-gray-400">
              <strong>Implication:</strong> A score of {averageScore}% indicates the organization is{" "}
              {averageScore >= 75 ? riskStatus.implicationGrowth : riskStatus.implicationFriction}.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm lg:col-span-2">
          <h4 className="mb-6 flex items-center gap-2 text-sm font-bold tracking-widest text-gray-900 uppercase">
            <Globe className="h-4 w-4 text-amber-600" /> Contextual Market Modifiers
          </h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {contextModifiers.map((modifier) => (
              <ContextModifierBar
                key={modifier.key}
                label={modifier.label}
                valueLabel={modifier.valueLabel}
                description={modifier.description}
                score={modifier.score}
              />
            ))}
          </div>
        </div>
      </div>

      <h4 className="text-lg font-bold text-gray-900">Pillar Diagnostics & Strategic Translation</h4>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h5 className="font-bold text-gray-900">
              1. Strategic Alignment ({scores.strategicAlignment}%)
            </h5>
            <span
              className={`rounded px-2 py-1 text-xs font-bold ${
                scores.strategicAlignment > 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {scores.strategicAlignment > 70 ? "Aligned" : "Fractured"}
            </span>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            {scores.strategicAlignment > 70
              ? "Departments operate with high synchronicity. Daily execution is deeply connected to executive targets, preventing wasted payroll."
              : "Severe misalignment detected. Teams are executing efficiently but in the wrong direction, resulting in high effort but low strategic yield."}
          </p>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
              Financial Implication
            </span>
            <p className="text-xs text-slate-700">
              A {scores.strategicAlignment}% alignment score indicates{" "}
              {100 - scores.strategicAlignment}% of operational capital is currently deployed toward
              non-strategic tasks.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h5 className="font-bold text-gray-900">
              2. Process Efficiency ({scores.processEfficiency}%)
            </h5>
            <span
              className={`rounded px-2 py-1 text-xs font-bold ${
                scores.processEfficiency > 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {scores.processEfficiency > 70 ? "Streamlined" : "Bottlenecked"}
            </span>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            {scores.processEfficiency > 70
              ? "Internal systems effectively amplify human capital. Red tape is minimized, allowing for rapid handoffs between departments."
              : "High systemic bloat. Employees are spending a disproportionate amount of time navigating internal friction rather than generating output."}
          </p>
          {infrastructureScore < 60 && scores.processEfficiency < 70 && (
            <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
                <AlertTriangle className="h-3 w-3" /> Contextual Warning
              </span>
              <p className="text-xs text-red-800">
                Low process efficiency is being dangerously compounded by a fragile external
                infrastructure score ({infrastructureScore}%). Expedite system decentralization.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h5 className="font-bold text-gray-900">
              3. Scalability Readiness ({scores.scalability}%)
            </h5>
            <span
              className={`rounded px-2 py-1 text-xs font-bold ${
                scores.scalability > 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              {scores.scalability > 70 ? "Architected for Growth" : "Fragile Structure"}
            </span>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            {scores.scalability > 70
              ? "The organization relies on robust, documented workflows rather than individual heroic efforts. Capable of handling a 2x volume surge."
              : "Growth relies heavily on individual hustle rather than repeatable architecture. Scaling further without restructuring will lead to operational collapse."}
          </p>
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className="mb-1 block text-[10px] font-bold text-slate-400 uppercase">
              Strategic Implication
            </span>
            <p className="text-xs text-slate-700">
              Investors viewing a {scores.scalability}% scalability score will see{" "}
              {scores.scalability > 70
                ? "a highly viable platform for capital injection."
                : "significant operational risk preventing rapid expansion."}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h5 className="font-bold text-gray-900">4. Team Cohesion ({scores.teamCohesion}%)</h5>
            <span
              className={`rounded px-2 py-1 text-xs font-bold ${
                scores.teamCohesion > 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {scores.teamCohesion > 70 ? "Psychologically Safe" : "High Flight Risk"}
            </span>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            {scores.teamCohesion > 70
              ? "High trust density enables rapid problem-solving and uninhibited innovation. Conflicts are resolved constructively."
              : "Low psychological safety detected. Hidden toxicity or burnout is likely present, suppressing idea generation and risking talent drain."}
          </p>
          {volatilityScore < 60 && scores.teamCohesion > 70 && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase">
                <Info className="h-3 w-3" /> Contextual Asset
              </span>
              <p className="text-xs text-blue-800">
                Despite high macro-market volatility ({volatilityScore}%), your exceptional team
                cohesion ({scores.teamCohesion}%) serves as an internal shock-absorber, protecting
                execution.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h4 className="mb-2 text-lg font-bold text-gray-900">
          Unfiltered Organizational Voice (Qualitative Signals)
        </h4>
        <p className="mb-6 text-sm text-gray-500">
          Verbatim insights from the open-ended survey module, providing specific context to the
          structural friction identified above. Individual respondents are not identified.
        </p>
        {qualitativeGroups.length === 0 ? (
          <p className="text-sm text-gray-400">No qualitative responses were captured for this campaign.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {qualitativeGroups.map((group) => (
              <div key={group.question} className="relative rounded-xl border border-slate-100 bg-slate-50 p-6">
                <div className="absolute top-6 left-6 font-serif text-4xl leading-none text-amber-200">
                  &ldquo;
                </div>
                <div className="pl-8">
                  <p className="mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase">
                    {group.question}
                  </p>
                  <div className="space-y-3">
                    {group.answers.map((answer, index) => (
                      <p
                        key={`${group.question}-${index}`}
                        className="text-sm leading-relaxed font-medium text-gray-800 italic"
                      >
                        {answer}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
