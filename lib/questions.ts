import type { Scores } from "./utils";

export type ScoreKey = keyof Scores;

export interface Question {
  id: ScoreKey;
  question: string;
  options: { label: string; value: number }[];
}

export interface ContextQuestion {
  id: string;
  question: string;
  role: "context" | "validation";
  options: { label: string; value: number }[];
}

export interface QualitativeQuestion {
  id: string;
  question: string;
}

/** One question per page - flat list */
export const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: "vision",
    question:
      "I clearly understand the long-term vision and strategic direction of this organization.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: "alignment",
    question:
      "Different departments work together seamlessly toward shared business objectives.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: "performance",
    question:
      "Decision-making processes within the organization are rapid and highly effective.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: "cohesion",
    question:
      "I feel a strong sense of psychological safety when sharing unconventional ideas with my team.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: "processes",
    question:
      "Our internal systems and software tools make my job easier, not harder.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: "scalability",
    question:
      "We rely on systematic, documented workflows rather than individual heroic efforts to get things done.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
];

export const CONTEXT_QUESTIONS: ContextQuestion[] = [
  {
    id: "infrastructure",
    role: "context",
    question:
      "Power grid instability or internet outages rarely disrupt our operational output.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
  {
    id: "decision_consistency",
    role: "validation",
    question:
      "The way decisions are made in my team matches the way leadership describes our decision-making process.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
  },
];

export const QUALITATIVE_QUESTIONS: QualitativeQuestion[] = [
  {
    id: "qual1",
    question:
      "What is the single biggest operational bottleneck preventing you from doing your best work right now?",
  },
  {
    id: "qual2",
    question:
      "If you could change one systemic or structural process tomorrow, what would it be and why?",
  },
  {
    id: "qual3",
    question:
      "What external market or environmental challenge is currently impacting your team's output the most?",
  },
];

/** Maps answer value (1-5) to score (0-100). 1=20, 2=40, 3=60, 4=80, 5=100 */
export function answerToScore(answerValue: number): number {
  const map: Record<number, number> = {
    1: 20,
    2: 40,
    3: 60,
    4: 80,
    5: 100,
  };
  return map[answerValue] ?? 50;
}

/** Convert form answers (by score key) to Scores object */
export function answersToScores(answers: Record<ScoreKey, number>): Scores {
  return {
    vision: answers.vision ?? 50,
    alignment: answers.alignment ?? 50,
    performance: answers.performance ?? 50,
    cohesion: answers.cohesion ?? 50,
    processes: answers.processes ?? 50,
    scalability: answers.scalability ?? 50,
  };
}

