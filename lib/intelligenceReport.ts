import type { Scores } from "./utils";

export type ReportContextVariable = {
  variableKey: string;
  question: string;
  averageScore: number;
  count: number;
};

export type ReportQualitativeResponse = {
  question: string;
  answer: string;
  scoreKey?: string;
  variableKey?: string;
};

export type ContextModifier = {
  key: string;
  label: string;
  valueLabel: string;
  description: string;
  score: number;
};

export type RiskStatus = {
  badge: string;
  implicationGrowth: string;
  implicationFriction: string;
};

const CONTEXT_MODIFIER_DEFS = [
  {
    key: "infrastructure",
    label: "Infrastructure Risk",
    valueLabel: "Prepared",
    description: "Measures operational immunity to power/connectivity disruptions.",
  },
  {
    key: "market_volatility",
    label: "Macro Volatility",
    valueLabel: "Agile",
    description: "Business model adaptability to currency and inflation shocks.",
  },
  {
    key: "regulatory_pressure",
    label: "Regulatory Agility",
    valueLabel: "Navigable",
    description: "Speed of compliance adaptation to regional policy changes.",
  },
] as const;

export function getRiskStatus(averageScore: number): RiskStatus {
  if (averageScore >= 75) {
    return {
      badge: "High Resilience",
      implicationGrowth: "highly capable of compounding growth while absorbing systemic shocks",
      implicationFriction: "highly capable of compounding growth while absorbing systemic shocks",
    };
  }
  if (averageScore >= 50) {
    return {
      badge: "Moderate Vulnerability",
      implicationGrowth: "capable of steady growth with manageable structural friction",
      implicationFriction: "experiencing structural friction that restricts exponential scaling",
    };
  }
  return {
    badge: "High Vulnerability",
    implicationGrowth: "facing significant structural constraints on growth",
    implicationFriction: "experiencing structural friction that restricts exponential scaling",
  };
}

function getContextScore(
  contextVariables: ReportContextVariable[],
  variableKey: string,
  fallback = 50
): number {
  const match = contextVariables.find((item) => item.variableKey === variableKey);
  return match?.averageScore ?? fallback;
}

export function buildContextModifiers(contextVariables: ReportContextVariable[]): ContextModifier[] {
  return CONTEXT_MODIFIER_DEFS.map((def) => ({
    ...def,
    score: getContextScore(contextVariables, def.key),
  }));
}

export function groupQualitativeResponses(responses: ReportQualitativeResponse[]) {
  const grouped = new Map<string, string[]>();

  responses.forEach((response) => {
    const question = response.question.trim();
    const answer = response.answer.trim();
    if (!question || !answer) return;
    const current = grouped.get(question) ?? [];
    current.push(answer);
    grouped.set(question, current);
  });

  return Array.from(grouped.entries()).map(([question, answers]) => ({ question, answers }));
}

export function getCoreScores(scores: Scores) {
  return {
    visionClarity: scores.vision,
    strategicAlignment: scores.alignment,
    executionSpeed: scores.performance,
    teamCohesion: scores.cohesion,
    processEfficiency: scores.processes,
    scalability: scores.scalability,
  };
}

export function getInfrastructureScore(contextVariables: ReportContextVariable[]) {
  return getContextScore(contextVariables, "infrastructure");
}

export function getVolatilityScore(contextVariables: ReportContextVariable[]) {
  return getContextScore(contextVariables, "market_volatility");
}
