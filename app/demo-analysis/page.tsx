"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Target, Zap, Component } from "lucide-react";
import PillarCard from "@/components/PillarCard";
import ExecutiveHeader from "@/components/ExecutiveHeader";
import StabilityBar from "@/components/StabilityBar";
import { DEFAULT_SCORES } from "@/lib/constants";
import {
  getAverageScore,
  getStabilityState,
  getRadarData,
  type Scores,
} from "@/lib/utils";

const RadarChart = dynamic(() => import("@/components/RadarChart"), {
  ssr: false,
});

export default function DemoAnalysisPage() {
  const [scores, setScores] = useState<Scores>({ ...DEFAULT_SCORES });

  const average = useMemo(() => getAverageScore(scores), [scores]);
  const stability = useMemo(() => getStabilityState(average), [average]);
  const radarData = useMemo(() => getRadarData(scores), [scores]);

  const updateScore = (key: keyof Scores, value: number) => {
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="mx-auto max-w-7xl">
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
                {
                  id: "vision",
                  label: "Vision Clarity",
                  value: scores.vision,
                  onChange: (v) => updateScore("vision", v),
                },
                {
                  id: "alignment",
                  label: "Strategic Alignment",
                  value: scores.alignment,
                  onChange: (v) => updateScore("alignment", v),
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
                  value: scores.performance,
                  onChange: (v) => updateScore("performance", v),
                },
                {
                  id: "cohesion",
                  label: "Team Cohesion",
                  value: scores.cohesion,
                  onChange: (v) => updateScore("cohesion", v),
                },
              ]}
            />
            <PillarCard
              title="3. Systems & Structure"
              icon={Component}
              inputs={[
                {
                  id: "processes",
                  label: "Process Efficiency",
                  value: scores.processes,
                  onChange: (v) => updateScore("processes", v),
                },
                {
                  id: "scalability",
                  label: "Scalability",
                  value: scores.scalability,
                  onChange: (v) => updateScore("scalability", v),
                },
              ]}
            />
          </div>

          <div className="lg:col-span-7">
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-[#1A1A1A] p-10 text-white shadow-2xl">
              <div className="relative z-10 mb-8">
                <h2 className="mb-2 text-3xl font-bold">Demo Health Profile</h2>
                <p className="text-sm text-gray-400">
                  Move the sliders on the left to see how the analysis responds.
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

