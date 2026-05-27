import "server-only";

import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";
import { getAverageScore, getStabilityState, type Scores } from "./utils";

const SCORE_KEYS = [
  "vision",
  "alignment",
  "performance",
  "cohesion",
  "processes",
  "scalability",
] as const;

export type ServerOrganization = {
  id: string;
  name: string;
  description?: string;
  size?: string;
  annualTurnover?: string;
  industry?: string;
  industryOther?: string;
  thresholdPercent: number;
  useDefaultQuestions: boolean;
  adminUid?: string;
  adminEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ServerCampaign = {
  id: string;
  orgId: string;
  name: string;
  status: "draft" | "active" | "closed";
  passcode?: string;
  createdAt?: string;
};

export type ServerInvite = {
  id: string;
  orgId: string;
  campaignId: string;
  email: string;
  token: string;
  status: "pending" | "completed";
  expiresAt?: string;
  completedAt?: string;
  emailStatus?: "pending" | "sent" | "failed" | "not_configured";
  sentAt?: string;
  lastEmailError?: string;
  resendCount?: number;
  createdAt?: string;
};

export type ServerReport = {
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
  generatedBy: string;
  generatedAt?: string;
};

function dateString(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === "object" && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    return maybeDate?.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

export function normalizeEmails(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((email) => String(email).trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );
}

export function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function organizationFromDoc(id: string, data: DocumentData): ServerOrganization {
  return {
    id,
    name: data.name ?? "",
    description: typeof data.description === "string" ? data.description : undefined,
    size: typeof data.size === "string" ? data.size : undefined,
    annualTurnover: typeof data.annualTurnover === "string" ? data.annualTurnover : undefined,
    industry: typeof data.industry === "string" ? data.industry : undefined,
    industryOther: typeof data.industryOther === "string" ? data.industryOther : undefined,
    thresholdPercent: data.thresholdPercent ?? 80,
    useDefaultQuestions: data.useDefaultQuestions ?? true,
    adminUid: data.adminUid,
    adminEmail: data.adminEmail,
    createdAt: dateString(data.createdAt),
    updatedAt: dateString(data.updatedAt),
  };
}

export function campaignFromDoc(id: string, data: DocumentData): ServerCampaign {
  return {
    id,
    orgId: data.orgId ?? "",
    name: data.name ?? "",
    status: data.status ?? "draft",
    passcode: data.passcode ?? undefined,
    createdAt: dateString(data.createdAt),
  };
}

export function inviteFromDoc(id: string, data: DocumentData): ServerInvite {
  return {
    id,
    orgId: data.orgId ?? "",
    campaignId: data.campaignId ?? "",
    email: data.email ?? "",
    token: data.token ?? "",
    status: data.status ?? "pending",
    expiresAt: dateString(data.expiresAt),
    completedAt: dateString(data.completedAt),
    emailStatus: data.emailStatus,
    sentAt: dateString(data.sentAt),
    lastEmailError: data.lastEmailError,
    resendCount: data.resendCount ?? 0,
    createdAt: dateString(data.createdAt),
  };
}

export function reportFromDoc(id: string, data: DocumentData): ServerReport {
  return {
    id,
    orgId: data.orgId ?? "",
    campaignId: data.campaignId ?? "",
    campaignName: data.campaignName ?? "",
    orgName: data.orgName ?? "",
    scores: data.scores,
    averageScore: data.averageScore ?? 0,
    stabilityLabel: data.stabilityLabel ?? "",
    stabilityHeaderLabel: data.stabilityHeaderLabel ?? "",
    completionCount: data.completionCount ?? 0,
    inviteCount: data.inviteCount ?? 0,
    thresholdPercent: data.thresholdPercent ?? 80,
    qualitativeResponses: Array.isArray(data.qualitativeResponses)
      ? data.qualitativeResponses
      : [],
    contextVariables: Array.isArray(data.contextVariables) ? data.contextVariables : [],
    validationSignals: Array.isArray(data.validationSignals) ? data.validationSignals : [],
    generatedBy: data.generatedBy ?? "",
    generatedAt: dateString(data.generatedAt),
  };
}

export async function getOrgOrThrow(orgId: string): Promise<ServerOrganization> {
  const snap = await adminDb.collection("organizations").doc(orgId).get();
  if (!snap.exists) throw new Response("Organization not found", { status: 404 });
  return organizationFromDoc(snap.id, snap.data() ?? {});
}

export async function getCampaignOrThrow(campaignId: string): Promise<ServerCampaign> {
  const snap = await adminDb.collection("campaigns").doc(campaignId).get();
  if (!snap.exists) throw new Response("Campaign not found", { status: 404 });
  return campaignFromDoc(snap.id, snap.data() ?? {});
}

export async function getCampaignInvites(campaignId: string): Promise<ServerInvite[]> {
  const snap = await adminDb
    .collection("invites")
    .where("campaignId", "==", campaignId)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((doc) => inviteFromDoc(doc.id, doc.data()));
}

export function aggregateResponses(invites: { status?: unknown; responses?: unknown }[]): Scores {
  const completed = invites.filter(
    (invite) => invite.status === "completed" && invite.responses && typeof invite.responses === "object"
  );
  const scores = Object.fromEntries(SCORE_KEYS.map((key) => [key, 50])) as Scores;

  for (const key of SCORE_KEYS) {
    const values = completed
      .map((invite) => (invite.responses as Record<string, unknown>)[key])
      .filter((value): value is number => typeof value === "number");
    scores[key] = values.length
      ? Math.round(values.reduce((total, value) => total + value, 0) / values.length)
      : 50;
  }

  return scores;
}

function aggregateQualitativeResponses(invites: DocumentData[]) {
  return invites
    .filter((invite) => invite.status === "completed" && invite.qualitativeResponses)
    .flatMap((invite) => Object.values(invite.qualitativeResponses as Record<string, unknown>))
    .filter(
      (value): value is {
        question: string;
        answer: string;
        scoreKey?: string;
        variableKey?: string;
      } =>
        Boolean(
          value &&
            typeof value === "object" &&
            typeof (value as { question?: unknown }).question === "string" &&
            typeof (value as { answer?: unknown }).answer === "string" &&
            (value as { answer: string }).answer.trim()
        )
    )
    .map((value) => ({
      question: value.question,
      answer: value.answer,
      scoreKey: value.scoreKey,
      variableKey: value.variableKey,
    }));
}

function aggregateDiagnosticResponses(
  invites: DocumentData[],
  role: "context" | "validation"
) {
  const grouped = new Map<
    string,
    { variableKey: string; question: string; scores: number[] }
  >();

  invites
    .filter((invite) => invite.status === "completed" && invite.diagnosticResponses)
    .flatMap((invite) => Object.values(invite.diagnosticResponses as Record<string, unknown>))
    .forEach((raw) => {
      if (!raw || typeof raw !== "object") return;
      const item = raw as Record<string, unknown>;
      if (item.role !== role || typeof item.score !== "number") return;

      const variableKey = String(item.variableKey ?? "").trim();
      const question = String(item.question ?? "").trim();
      if (!variableKey || !question) return;

      const current = grouped.get(variableKey) ?? { variableKey, question, scores: [] };
      current.scores.push(item.score);
      grouped.set(variableKey, current);
    });

  return Array.from(grouped.values()).map((item) => ({
    variableKey: item.variableKey,
    question: item.question,
    averageScore: Math.round(
      item.scores.reduce((total, score) => total + score, 0) / item.scores.length
    ),
    count: item.scores.length,
  }));
}

export async function writeAuditLog(data: {
  actorUid: string;
  actorEmail?: string;
  orgId?: string;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await adminDb.collection("auditLogs").add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export function buildReportDoc({
  org,
  campaign,
  invites,
  generatedBy,
}: {
  org: ServerOrganization;
  campaign: ServerCampaign;
  invites: DocumentData[];
  generatedBy: string;
}) {
  const completed = invites.filter((invite) => invite.status === "completed");
  const scores = aggregateResponses(invites);
  const averageScore = getAverageScore(scores);
  const stability = getStabilityState(averageScore);
  const qualitativeResponses = aggregateQualitativeResponses(invites);
  const contextVariables = aggregateDiagnosticResponses(invites, "context");
  const validationSignals = aggregateDiagnosticResponses(invites, "validation");

  return {
    orgId: org.id,
    campaignId: campaign.id,
    orgName: org.name,
    campaignName: campaign.name,
    scores,
    averageScore,
    stabilityLabel: stability.label,
    stabilityHeaderLabel: stability.headerLabel,
    completionCount: completed.length,
    inviteCount: invites.length,
    thresholdPercent: org.thresholdPercent,
    qualitativeResponses,
    contextVariables,
    validationSignals,
    generatedBy,
    generatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}
