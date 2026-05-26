import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { toErrorResponse } from "@/lib/serverAuth";

const SCORE_KEYS = ["vision", "alignment", "performance", "cohesion", "processes", "scalability"];

function parseResponses(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const responses: Record<string, number> = {};

  for (const key of SCORE_KEYS) {
    const score = input[key];
    if (typeof score !== "number" || score < 0 || score > 100) return null;
    responses[key] = Math.round(score);
  }

  return responses;
}

function parseQualitativeResponses(
  value: unknown
): Record<string, { question: string; answer: string; scoreKey: string; variableKey: string }> {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const output: Record<
    string,
    { question: string; answer: string; scoreKey: string; variableKey: string }
  > = {};

  Object.entries(input).forEach(([id, raw]) => {
    if (!raw || typeof raw !== "object") return;
    const item = raw as Record<string, unknown>;
    const question = String(item.question ?? "").trim();
    const answer = String(item.answer ?? "").trim();
    const scoreKey = String(item.scoreKey ?? "").trim();
    const variableKey = String(item.variableKey ?? id).trim();
    if (question && answer) output[id] = { question, answer, scoreKey, variableKey };
  });

  return output;
}

function parseDiagnosticResponses(
  value: unknown
): Record<
  string,
  {
    question: string;
    role: "context" | "validation";
    variableKey: string;
    score: number;
    answer: string;
  }
> {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  const output: Record<
    string,
    {
      question: string;
      role: "context" | "validation";
      variableKey: string;
      score: number;
      answer: string;
    }
  > = {};

  Object.entries(input).forEach(([id, raw]) => {
    if (!raw || typeof raw !== "object") return;
    const item = raw as Record<string, unknown>;
    const role = item.role === "validation" ? "validation" : "context";
    const question = String(item.question ?? "").trim();
    const variableKey = String(item.variableKey ?? id).trim();
    const answer = String(item.answer ?? "").trim();
    const score = Number(item.score);
    if (question && variableKey && Number.isFinite(score) && score >= 0 && score <= 100) {
      output[id] = { question, role, variableKey, score: Math.round(score), answer };
    }
  });

  return output;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const passcode = String(body.passcode ?? "").trim();
    const responses = parseResponses(body.responses);
    const qualitativeResponses = parseQualitativeResponses(body.qualitativeResponses);
    const diagnosticResponses = parseDiagnosticResponses(body.diagnosticResponses);

    if (!token) return new Response("Token is required", { status: 400 });
    if (!responses) return new Response("Valid responses are required", { status: 400 });

    const snap = await adminDb.collection("invites").where("token", "==", token).limit(1).get();
    if (snap.empty) return new Response("Invalid invite", { status: 404 });

    const inviteDoc = snap.docs[0];
    const invite = inviteDoc.data();
    const expiresAt = invite.expiresAt?.toDate?.() as Date | undefined;
    if (invite.status === "completed" || !expiresAt || Date.now() > expiresAt.getTime()) {
      return new Response("Invalid invite", { status: 404 });
    }
    if (invite.passcode && invite.passcode !== passcode) {
      return new Response("Invalid passcode", { status: 403 });
    }

    await inviteDoc.ref.update({
      status: "completed",
      responses,
      qualitativeResponses,
      diagnosticResponses,
      completedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
