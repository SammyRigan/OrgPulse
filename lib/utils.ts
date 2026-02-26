import { COLORS, STABILITY_THRESHOLDS } from "./constants";

export type Scores = {
  vision: number;
  alignment: number;
  performance: number;
  cohesion: number;
  processes: number;
  scalability: number;
};

export function getAverageScore(scores: Scores): number {
  const values = Object.values(scores);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export type StabilityState = {
  label: string;
  headerLabel: string;
  color: string;
  barColor: string;
};

export function getStabilityState(average: number): StabilityState {
  if (average >= STABILITY_THRESHOLDS.resilient) {
    return {
      label: "High Stability",
      headerLabel: "Optimal Stability",
      color: COLORS.emeraldLight,
      barColor: COLORS.emerald,
    };
  }
  if (average >= STABILITY_THRESHOLDS.moderate) {
    return {
      label: "Moderate Stability",
      headerLabel: "Moderate Risk",
      color: COLORS.amberLight,
      barColor: COLORS.amber,
    };
  }
  return {
    label: "Low Stability",
    headerLabel: "Critical Risk",
    color: COLORS.redLight,
    barColor: COLORS.red,
  };
}

export function getRadarData(scores: Scores): number[] {
  return [
    scores.vision,
    scores.alignment,
    scores.performance,
    scores.cohesion,
    scores.processes,
    scores.scalability,
  ];
}
