import type { Scores } from "./utils";

export type ScoreKey = keyof Scores;

export interface Question {
  id: ScoreKey;
  question: string;
  options: { label: string; value: number }[];
}

/** One question per page - flat list */
export const ASSESSMENT_QUESTIONS: Question[] = [
  {
    id: "vision",
    question:
      "Our organization has a clear, well-articulated vision that everyone understands and can describe.",
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
      "Strategy and priorities cascade clearly from leadership to teams, with alignment across departments.",
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
      "Teams consistently deliver on commitments and move quickly from decision to execution.",
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
      "Teams collaborate effectively, trust each other, and resolve conflicts constructively.",
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
      "Core processes (e.g., planning, hiring, delivery) are documented, consistent, and efficient.",
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
      "Our structure and systems can support growth without significant friction or rework.",
    options: [
      { label: "Strongly Disagree", value: 1 },
      { label: "Disagree", value: 2 },
      { label: "Neutral", value: 3 },
      { label: "Agree", value: 4 },
      { label: "Strongly Agree", value: 5 },
    ],
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

