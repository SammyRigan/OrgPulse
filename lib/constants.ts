export const CATEGORIES = [
  "Vision Clarity",
  "Strategic Alignment",
  "Execution Speed",
  "Team Cohesion",
  "Process Efficiency",
  "Scalability",
] as const;

export const DEFAULT_SCORES = {
  vision: 60,
  alignment: 50,
  performance: 70,
  cohesion: 40,
  processes: 30,
  scalability: 50,
} as const;

export const STABILITY_THRESHOLDS = {
  resilient: 75,
  moderate: 50,
} as const;

export const COLORS = {
  amber: "#D97706",
  emerald: "#10B981",
  red: "#EF4444",
  amberLight: "#FBBF24",
  emeraldLight: "#34D399",
  redLight: "#F87171",
} as const;
