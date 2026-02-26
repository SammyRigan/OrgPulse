"use client";

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { CATEGORIES } from "@/lib/constants";

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  data: number[];
}

export default function RadarChart({ data }: RadarChartProps) {
  const chartData = {
    labels: [...CATEGORIES],
    datasets: [
      {
        data,
        backgroundColor: "rgba(217, 119, 6, 0.25)",
        borderColor: "#D97706",
        borderWidth: 3,
        pointBackgroundColor: "#1A1A1A",
        pointBorderColor: "#D97706",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.1,
      },
    ],
  };

  const options = {
    scales: {
      r: {
        angleLines: { color: "rgba(255, 255, 255, 0.08)" },
        grid: { color: "rgba(255, 255, 255, 0.08)" },
        pointLabels: {
          color: "#9CA3AF",
          font: {
            size: 12,
            weight: 600 as const,
            family: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif",
          },
        },
        ticks: { display: false },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
    plugins: {
      legend: { display: false },
    },
    maintainAspectRatio: false,
    animation: { duration: 800 },
  };

  return (
    <div className="relative flex h-[400px] w-full items-center justify-center py-6 md:h-[450px]">
      <Radar data={chartData} options={options} />
    </div>
  );
}
