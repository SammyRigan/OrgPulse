import type { Scores } from "@/lib/utils";

export type Organization = {
  id: string;
  thresholdPercent: number;
};

export type Campaign = {
  id: string;
  name: string;
};

export type Invite = {
  id: string;
  status: "pending" | "completed";
};

export type Report = {
  id: string;
  orgId: string;
  campaignId: string;
  campaignName: string;
  orgName: string;
  scores: Scores;
  averageScore: number;
  stabilityLabel: string;
  stabilityHeaderLabel: string;
  completionCount: number;
  inviteCount: number;
  thresholdPercent: number;
  qualitativeResponses: { question: string; answer: string; scoreKey?: string; variableKey?: string }[];
  contextVariables: { variableKey: string; question: string; averageScore: number; count: number }[];
  validationSignals: { variableKey: string; question: string; averageScore: number; count: number }[];
  generatedAt?: string;
};

