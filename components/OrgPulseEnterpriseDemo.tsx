"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Target,
  Zap,
  Component as ComponentIcon,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  FileText,
  AlertTriangle,
  Globe,
  Activity,
  Info,
  Download,
} from "lucide-react";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

const CHART_FONT =
  "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif";

type QuestionType = "core" | "hidden";

interface SurveyQuestion {
  id: string;
  metric: string;
  type: QuestionType;
  text: string;
}

/** Seven Likert items: one per core pillar plus one regional context modifier. */
const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: "q1",
    metric: "visionClarity",
    type: "core",
    text: "I clearly understand the long-term vision and strategic direction of this organization.",
  },
  {
    id: "q2",
    metric: "strategicAlignment",
    type: "core",
    text: "Different departments work together seamlessly toward shared business objectives.",
  },
  {
    id: "q3",
    metric: "executionSpeed",
    type: "core",
    text: "Decision-making processes within the organization are rapid and highly effective.",
  },
  {
    id: "q4",
    metric: "teamCohesion",
    type: "core",
    text: "I feel a strong sense of psychological safety when sharing unconventional ideas with my team.",
  },
  {
    id: "q5",
    metric: "processEfficiency",
    type: "core",
    text: "Our internal systems and software tools make my job easier, not harder.",
  },
  {
    id: "q6",
    metric: "scalability",
    type: "core",
    text: "We rely on systematic, documented workflows rather than individual heroic efforts to get things done.",
  },
  {
    id: "q7",
    metric: "infrastructure",
    type: "hidden",
    text: "Power grid instability or internet outages rarely disrupt our operational output.",
  },
];

interface QualitativeQuestion {
  id: string;
  text: string;
}

const QUALITATIVE_QUESTIONS: QualitativeQuestion[] = [
  { id: "qual1", text: "What is the single biggest operational bottleneck preventing you from doing your best work right now?" },
  { id: "qual2", text: "If you could change one systemic or structural process tomorrow, what would it be and why?" },
  { id: "qual3", text: "What external market or environmental challenge is currently impacting your team's output the most?" },
];

type TabId = "survey" | "dashboard" | "report";

interface CoreScores {
  visionClarity: number;
  strategicAlignment: number;
  executionSpeed: number;
  teamCohesion: number;
  processEfficiency: number;
  scalability: number;
}

interface HiddenContext {
  infrastructure: number;
  volatility: number;
  regulatory: number;
}

const INITIAL_SCORES: CoreScores = {
  visionClarity: 82,
  strategicAlignment: 85,
  executionSpeed: 80,
  teamCohesion: 92,
  processEfficiency: 78,
  scalability: 88,
};

const INITIAL_HIDDEN: HiddenContext = {
  infrastructure: 75,
  volatility: 60,
  regulatory: 65,
};

function SliderControl({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: keyof CoreScores;
  value: number;
  onChange: (id: keyof CoreScores, value: number) => void;
}) {
  return (
    <div className="group py-2">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
          {label}
        </label>
        <span className="text-xs font-bold text-gray-700">{value}%</span>
      </div>
      <div className="relative flex items-center">
        <div className="absolute h-[2px] w-full rounded-full bg-gray-100" />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(id, parseInt(e.target.value, 10) || 0)}
          className="relative z-10 h-1 w-full cursor-pointer appearance-none bg-transparent
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-webkit-slider-thumb]:bg-[#D97706] [&::-webkit-slider-thumb]:shadow-sm"
        />
      </div>
    </div>
  );
}

export default function OrgPulseEnterpriseDemo() {
  const [activeTab, setActiveTab] = useState<TabId>("survey");
  const [scores, setScores] = useState<CoreScores>({ ...INITIAL_SCORES });
  const [hiddenContext, setHiddenContext] = useState<HiddenContext>({ ...INITIAL_HIDDEN });
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, number>>({});
  const [qualitativeAnswers, setQualitativeAnswers] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  const averageScore = useMemo(() => {
    const values = Object.values(scores) as number[];
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }, [scores]);

  const riskStatus = useMemo(() => {
    if (averageScore >= 75)
      return {
        label: "Optimal Stability",
        color: "text-[#10B981]",
        bar: "bg-[#10B981]",
        badge: "High Resilience",
      };
    if (averageScore >= 50)
      return {
        label: "Moderate Stability",
        color: "text-amber-500",
        bar: "bg-amber-500",
        badge: "Moderate Vulnerability",
      };
    return {
      label: "Critical Risk",
      color: "text-red-500",
      bar: "bg-red-500",
      badge: "High Vulnerability",
    };
  }, [averageScore]);

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    chartInstance.current = new ChartJS(ctx, {
      type: "radar",
      data: {
        labels: [
          "Vision Clarity",
          "Strategic Alignment",
          "Execution Speed",
          "Team Cohesion",
          "Process Efficiency",
          "Scalability",
        ],
        datasets: [
          {
            data: [
              scores.visionClarity,
              scores.strategicAlignment,
              scores.executionSpeed,
              scores.teamCohesion,
              scores.processEfficiency,
              scores.scalability,
            ],
            backgroundColor: "rgba(217, 119, 6, 0.3)",
            borderColor: "#D97706",
            borderWidth: 2,
            pointBackgroundColor: "#D97706",
            pointBorderColor: "#D97706",
            pointBorderWidth: 1,
            pointRadius: 4,
            fill: true,
            tension: 0.1,
          },
        ],
      },
      options: {
        scales: {
          r: {
            angleLines: { color: "rgba(255, 255, 255, 0.1)" },
            grid: { color: "rgba(255, 255, 255, 0.1)" },
            pointLabels: {
              color: "#9CA3AF",
              font: {
                size: 9,
                family: CHART_FONT,
                weight: 600,
              },
            },
            ticks: { display: false },
            suggestedMin: 0,
            suggestedMax: 100,
          },
        },
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        maintainAspectRatio: false,
        animation: { duration: 800 },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [activeTab, scores]);

  const handleAnswer = (questionId: string, value: number) => {
    setSurveyAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleQualitativeAnswer = (questionId: string, value: string) => {
    setQualitativeAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const autofillForTesting = () => {
    const dummyAnswers: Record<string, number> = {};
    SURVEY_QUESTIONS.forEach((q) => {
      dummyAnswers[q.id] = Math.floor(Math.random() * 3) + 3;
    });
    setSurveyAnswers(dummyAnswers);
    setQualitativeAnswers({
      qual1:
        "Cross-departmental approvals take up to 4 days for simple budget requests, stalling project momentum.",
      qual2:
        "I would implement a unified project management software. Right now, data is scattered across Slack, email, and 3 different task apps.",
      qual3:
        "Sudden currency devaluation has completely disrupted our pricing model, forcing us to constantly renegotiate with local vendors.",
    });
  };

  const processSurveyData = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      const mapScore = (val: number) => (val - 1) * 25;

      const newScores: Record<string, number> = {
        visionClarity: 0,
        strategicAlignment: 0,
        executionSpeed: 0,
        teamCohesion: 0,
        processEfficiency: 0,
        scalability: 0,
      };
      const coreCounts: Record<string, number> = {
        visionClarity: 0,
        strategicAlignment: 0,
        executionSpeed: 0,
        teamCohesion: 0,
        processEfficiency: 0,
        scalability: 0,
      };

      const newHidden: Record<string, number> = {
        infrastructure: 0,
        volatility: 0,
        regulatory: 0,
      };
      const hiddenCounts: Record<string, number> = {
        infrastructure: 0,
        volatility: 0,
        regulatory: 0,
      };

      Object.entries(surveyAnswers).forEach(([qId, val]) => {
        const question = SURVEY_QUESTIONS.find((q) => q.id === qId);
        if (question) {
          const mappedVal = mapScore(val);
          if (question.type === "core") {
            newScores[question.metric] += mappedVal;
            coreCounts[question.metric] += 1;
          } else {
            newHidden[question.metric] += mappedVal;
            hiddenCounts[question.metric] += 1;
          }
        }
      });

      const updatedScores = { ...scores };
      (Object.keys(newScores) as (keyof CoreScores)[]).forEach((key) => {
        if (coreCounts[key] > 0) {
          updatedScores[key] = Math.round(newScores[key] / coreCounts[key]);
        }
      });
      setScores(updatedScores);

      const updatedHidden = { ...hiddenContext };
      (Object.keys(newHidden) as (keyof HiddenContext)[]).forEach((key) => {
        if (hiddenCounts[key] > 0) {
          updatedHidden[key] = Math.round(newHidden[key] / hiddenCounts[key]);
        }
      });
      setHiddenContext(updatedHidden);

      setIsAnalyzing(false);
      setActiveTab("dashboard");
    }, 1500);
  };

  const exportDataToCSV = () => {
    const headers = ["Category", "Metric/Question ID", "Question Text", "Score/Response"];
    const rows: (string | number)[][] = [];

    Object.entries(scores).forEach(([key, value]) =>
      rows.push(["Core Score", key, "", value])
    );
    Object.entries(hiddenContext).forEach(([key, value]) =>
      rows.push(["Context Score", key, "", value])
    );

    SURVEY_QUESTIONS.forEach((q) => {
      const answer = surveyAnswers[q.id] !== undefined ? surveyAnswers[q.id] : "N/A";
      const safeText = `"${q.text.replace(/"/g, '""')}"`;
      rows.push(["Quantitative Response", q.id, safeText, answer]);
    });

    QUALITATIVE_QUESTIONS.forEach((q) => {
      const answer = qualitativeAnswers[q.id] || "N/A";
      const safeText = `"${q.text.replace(/"/g, '""')}"`;
      const safeAnswer = `"${answer.replace(/"/g, '""').replace(/\n/g, " ")}"`;
      rows.push(["Qualitative Response", q.id, safeText, safeAnswer]);
    });

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orgpulse_data_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const setScore = (id: keyof CoreScores, value: number) => {
    setScores((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10 font-sans text-gray-900">
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-6 py-4 lg:flex-row lg:px-10">
          <div className="mb-4 flex items-center gap-3 md:mb-0">
            <div className="rounded-lg bg-amber-600 p-2">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#1F2937]">
              OrgPulse <span className="font-medium text-amber-600">Enterprise</span>
            </h1>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("survey")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "survey"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <ClipboardList className="h-4 w-4" /> Survey Engine
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "dashboard"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Org Health Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("report")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === "report"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <FileText className="h-4 w-4" /> Intelligence Report
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto mt-10 max-w-7xl px-6 lg:px-10">
        {activeTab === "dashboard" && (
          <div className="duration-300">
            <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">Diagnostic Dashboard</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Simulate architectural changes across the Six-Axis Model.
                </p>
              </div>
              <div className="flex items-center rounded-xl border border-gray-100 bg-white p-1 px-4 shadow-sm">
                <div className="flex flex-col border-r border-gray-100 py-3 pr-4">
                  <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
                    Resilience Quotient
                  </span>
                  <span className="text-3xl font-black text-gray-800">{averageScore}%</span>
                </div>
                <div className="flex flex-col py-3 pl-4">
                  <span className="text-[9px] font-bold tracking-widest text-gray-400 uppercase">
                    Stability Profile
                  </span>
                  <span className={`text-sm font-bold ${riskStatus.color}`}>{riskStatus.badge}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-4">
                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-600" />
                    <h3 className="font-bold text-gray-800">1. Vision & Alignment</h3>
                  </div>
                  <SliderControl
                    label="Vision Clarity"
                    id="visionClarity"
                    value={scores.visionClarity}
                    onChange={setScore}
                  />
                  <SliderControl
                    label="Strategic Alignment"
                    id="strategicAlignment"
                    value={scores.strategicAlignment}
                    onChange={setScore}
                  />
                </section>
                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-600" />
                    <h3 className="font-bold text-gray-800">2. Team Performance</h3>
                  </div>
                  <SliderControl
                    label="Execution Speed"
                    id="executionSpeed"
                    value={scores.executionSpeed}
                    onChange={setScore}
                  />
                  <SliderControl
                    label="Team Cohesion"
                    id="teamCohesion"
                    value={scores.teamCohesion}
                    onChange={setScore}
                  />
                </section>
                <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <ComponentIcon className="h-5 w-5 text-amber-600" />
                    <h3 className="font-bold text-gray-800">3. Systems & Structure</h3>
                  </div>
                  <SliderControl
                    label="Process Efficiency"
                    id="processEfficiency"
                    value={scores.processEfficiency}
                    onChange={setScore}
                  />
                  <SliderControl
                    label="Scalability"
                    id="scalability"
                    value={scores.scalability}
                    onChange={setScore}
                  />
                </section>
              </div>
              <div className="lg:col-span-8">
                <div className="relative flex h-full flex-col overflow-hidden rounded-4xl bg-[#1A1A1A] p-10 shadow-xl">
                  <div className="relative z-10 mb-8">
                    <h2 className="mb-1 text-2xl font-bold text-white">Structural Profile Map</h2>
                    <p className="text-xs text-gray-400">
                      Aggregated real-time visualization of foundational pillars.
                    </p>
                  </div>
                  <div className="relative z-10 flex min-h-[400px] grow items-center justify-center">
                    <canvas ref={chartRef} className="max-h-[400px] w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "survey" && (
          <div className="mx-auto max-w-4xl duration-300">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">Data Aggregation Engine</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
                Seven quantitative items map to the six-axis model plus one regional context
                modifier; three open-ended prompts capture qualitative signals for the report.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 bg-slate-50 p-6">
                <span className="text-sm font-bold tracking-widest text-slate-500 uppercase">
                  Diagnostic Questionnaire
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-600">
                  Secure & Anonymous
                </span>
              </div>

              <div className="space-y-10 p-8">
                {SURVEY_QUESTIONS.map((q, index) => (
                  <div
                    key={q.id}
                    className="border-b border-gray-100 pb-8 last:border-0 last:pb-0"
                  >
                    <div className="mb-4 flex items-start gap-4">
                      <span className="text-sm font-bold text-slate-300">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                      <div>
                        <p className="font-medium leading-relaxed text-gray-800">{q.text}</p>
                        {q.type === "hidden" && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-500 uppercase">
                            <Globe className="h-3 w-3" /> Context Variable
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex max-w-xl items-center justify-between pl-8">
                      <span className="text-xs font-medium text-gray-400">Strongly Disagree</span>
                      <div className="flex gap-4">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={`${q.id}-${val}`}
                            type="button"
                            onClick={() => handleAnswer(q.id, val)}
                            className={`h-10 w-10 rounded-full border-2 text-sm font-bold transition-all ${
                              surveyAnswers[q.id] === val
                                ? "scale-110 border-amber-600 bg-amber-600 text-white shadow-md"
                                : "border-gray-200 bg-white text-gray-500 hover:border-amber-400 hover:text-amber-600"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-400">Strongly Agree</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 bg-slate-50 p-8">
                <h3 className="mb-2 text-xl font-bold text-gray-900">Qualitative Context</h3>
                <p className="mb-8 text-sm text-gray-500">
                  Please provide specific examples or challenges to support the diagnostic analysis.
                </p>
                <div className="space-y-8">
                  {QUALITATIVE_QUESTIONS.map((q, index) => (
                    <div key={q.id}>
                      <label className="mb-3 block font-medium text-gray-800">
                        <span className="mr-2 font-bold text-amber-600">Q{index + 1}.</span>
                        {q.text}
                      </label>
                      <textarea
                        value={qualitativeAnswers[q.id] || ""}
                        onChange={(e) => handleQualitativeAnswer(q.id, e.target.value)}
                        placeholder="Type your insights here..."
                        className="h-24 w-full resize-none rounded-xl border border-gray-200 p-4 text-sm text-gray-700 shadow-sm outline-none transition-all focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 bg-white p-6 sm:flex-row">
                <button
                  type="button"
                  onClick={autofillForTesting}
                  className="text-xs font-bold text-gray-400 underline transition-colors hover:text-amber-600"
                >
                  Autofill with Dummy Data (Dev Test)
                </button>
                <button
                  type="button"
                  onClick={processSurveyData}
                  disabled={
                    isAnalyzing || Object.keys(surveyAnswers).length < SURVEY_QUESTIONS.length
                  }
                  className="flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />{" "}
                      Synthesizing Data...
                    </>
                  ) : (
                    <>
                      Run Advanced Analytics <BarChart3 className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div className="duration-300">
            <div className="mb-8 flex flex-col items-start justify-end gap-4 md:flex-row">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">
                  Executive Intelligence Report
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Context-aware strategic analysis derived from survey responses and sliders.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={exportDataToCSV}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-bold text-amber-600 shadow-sm transition-colors hover:bg-amber-100"
                >
                  Export PDF
                </button>
              </div>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
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
                    <strong>Implication:</strong> A score of {averageScore}% indicates the
                    organization is{" "}
                    {averageScore >= 75
                      ? "highly capable of compounding growth while absorbing systemic shocks"
                      : "experiencing structural friction that restricts exponential scaling"}
                    .
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm lg:col-span-2">
                <h4 className="mb-6 flex items-center gap-2 text-sm font-bold tracking-widest text-gray-900 uppercase">
                  <Globe className="h-4 w-4 text-amber-600" /> Contextual Market Modifiers
                </h4>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Infrastructure Risk
                      </span>
                      <span
                        className={`text-xs font-bold ${hiddenContext.infrastructure < 60 ? "text-red-500" : "text-emerald-500"}`}
                      >
                        {hiddenContext.infrastructure}% Prepared
                      </span>
                    </div>
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full ${hiddenContext.infrastructure < 60 ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${hiddenContext.infrastructure}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Measures operational immunity to power/connectivity disruptions.
                    </p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Macro Volatility
                      </span>
                      <span
                        className={`text-xs font-bold ${hiddenContext.volatility < 60 ? "text-red-500" : "text-emerald-500"}`}
                      >
                        {hiddenContext.volatility}% Agile
                      </span>
                    </div>
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full ${hiddenContext.volatility < 60 ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${hiddenContext.volatility}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Business model adaptability to currency and inflation shocks.
                    </p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Regulatory Agility
                      </span>
                      <span
                        className={`text-xs font-bold ${hiddenContext.regulatory < 60 ? "text-red-500" : "text-emerald-500"}`}
                      >
                        {hiddenContext.regulatory}% Navigable
                      </span>
                    </div>
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full ${hiddenContext.regulatory < 60 ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${hiddenContext.regulatory}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Speed of compliance adaptation to regional policy changes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <h4 className="mb-6 text-lg font-bold text-gray-900">
              Pillar Diagnostics & Strategic Translation
            </h4>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h5 className="font-bold text-gray-900">
                    1. Strategic Alignment ({scores.strategicAlignment}%)
                  </h5>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${scores.strategicAlignment > 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
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
                    {100 - scores.strategicAlignment}% of operational capital is currently deployed
                    toward non-strategic tasks.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h5 className="font-bold text-gray-900">
                    2. Process Efficiency ({scores.processEfficiency}%)
                  </h5>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${scores.processEfficiency > 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {scores.processEfficiency > 70 ? "Streamlined" : "Bottlenecked"}
                  </span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  {scores.processEfficiency > 70
                    ? "Internal systems effectively amplify human capital. Red tape is minimized, allowing for rapid handoffs between departments."
                    : "High systemic bloat. Employees are spending a disproportionate amount of time navigating internal friction rather than generating output."}
                </p>
                {hiddenContext.infrastructure < 60 && scores.processEfficiency < 70 && (
                  <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3">
                    <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase">
                      <AlertTriangle className="h-3 w-3" /> Contextual Warning
                    </span>
                    <p className="text-xs text-red-800">
                      Low process efficiency is being dangerously compounded by a fragile external
                      infrastructure score ({hiddenContext.infrastructure}%). Expedite system
                      decentralization.
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
                    className={`rounded px-2 py-1 text-xs font-bold ${scores.scalability > 70 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {scores.scalability > 70 ? "Architected for Growth" : "Fragile Structure"}
                  </span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  {scores.scalability > 70
                    ? "The organization relies on robust, documented workflows rather than individual heroic efforts. Capable of handling a 2x volume surge."
                    : "Growth relies heavily on individual 'hustle' rather than repeatable architecture. Scaling further without restructuring will lead to operational collapse."}
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
                  <h5 className="font-bold text-gray-900">
                    4. Team Cohesion ({scores.teamCohesion}%)
                  </h5>
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${scores.teamCohesion > 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {scores.teamCohesion > 70 ? "Psychologically Safe" : "High Flight Risk"}
                  </span>
                </div>
                <p className="mb-4 text-sm text-gray-600">
                  {scores.teamCohesion > 70
                    ? "High trust density enables rapid problem-solving and uninhibited innovation. Conflicts are resolved constructively."
                    : "Low psychological safety detected. Hidden toxicity or burnout is likely present, suppressing idea generation and risking talent drain."}
                </p>
                {hiddenContext.volatility < 60 && scores.teamCohesion > 70 && (
                  <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase">
                      <Info className="h-3 w-3" /> Contextual Asset
                    </span>
                    <p className="text-xs text-blue-800">
                      Despite high macro-market volatility ({hiddenContext.volatility}%), your
                      exceptional team cohesion ({scores.teamCohesion}%) serves as an internal
                      shock-absorber, protecting execution.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h4 className="mb-2 text-lg font-bold text-gray-900">
                Unfiltered Organizational Voice (Qualitative Signals)
              </h4>
              <p className="mb-6 text-sm text-gray-500">
                The following verbatim insights were extracted from the open-ended survey module,
                providing highly specific context to the structural friction identified above.
              </p>
              <div className="grid grid-cols-1 gap-6">
                {QUALITATIVE_QUESTIONS.map((q) => (
                  <div
                    key={q.id}
                    className="relative rounded-xl border border-slate-100 bg-slate-50 p-6"
                  >
                    <div className="absolute top-6 left-6 font-serif text-4xl leading-none text-amber-200">
                      &ldquo;
                    </div>
                    <div className="pl-8">
                      <p className="mb-3 text-xs font-bold tracking-widest text-gray-400 uppercase">
                        {q.text}
                      </p>
                      <p className="text-sm leading-relaxed font-medium text-gray-800 italic">
                        {qualitativeAnswers[q.id] ?? (
                          <span className="font-normal text-gray-400">
                            No qualitative context provided by respondent.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
