import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperAdmin, toErrorResponse } from "@/lib/serverAuth";
import { writeAuditLog } from "@/lib/serverOrgData";

const COLLECTION = "defaultQuestions";

type QuestionOptionInput = {
  label?: unknown;
  points?: unknown;
};

function normalizeOptions(options: unknown) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option: QuestionOptionInput, index) => ({
      label: String(option.label ?? "").trim(),
      points: Number(option.points) || 0,
      order: index,
    }))
    .filter((option) => option.label);
}

function questionFromDoc(id: string, data: DocumentData) {
  const options = Array.isArray(data.options)
    ? [...data.options].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];

  return {
    id,
    text: data.text ?? "",
    type: data.type === "qualitative" ? "qualitative" : "quantitative",
    role:
      data.role === "context" || data.role === "validation"
        ? data.role
        : data.type === "qualitative"
          ? "context"
          : "score",
    variableKey: data.variableKey ?? data.scoreKey ?? id,
    scoreKey: data.scoreKey ?? "vision",
    order: data.order ?? 0,
    options,
  };
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);
    const snap = await adminDb.collection(COLLECTION).orderBy("order", "asc").get();
    return NextResponse.json({
      questions: snap.docs.map((doc) => questionFromDoc(doc.id, doc.data())),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    const body = await request.json();
    const text = String(body.text ?? "").trim();
    const type = body.type === "qualitative" ? "qualitative" : "quantitative";
    const role =
      body.role === "context" || body.role === "validation"
        ? body.role
        : type === "qualitative"
          ? "context"
          : "score";
    const scoreKey = String(body.scoreKey ?? "vision").trim();
    const variableKey = String(body.variableKey ?? scoreKey).trim() || scoreKey;
    const options = normalizeOptions(body.options);

    if (!text) return new Response("Question text is required", { status: 400 });
    if (type === "quantitative" && !options.length) {
      return new Response("At least one answer option is required", { status: 400 });
    }

    const snapshot = await adminDb.collection(COLLECTION).get();
    const maxOrder = snapshot.docs.reduce(
      (max, doc) => Math.max(max, Number(doc.get("order")) || 0),
      -1
    );

    const docRef = await adminDb.collection(COLLECTION).add({
      text,
      type,
      role,
      variableKey,
      scoreKey,
      order: maxOrder + 1,
      options: type === "quantitative" ? options : [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "admin.question.create",
      metadata: { questionId: docRef.id, scoreKey, type, role, variableKey },
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return new Response("Question id is required", { status: 400 });

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (typeof body.text === "string") update.text = body.text.trim();
    if (body.type === "qualitative" || body.type === "quantitative") update.type = body.type;
    if (body.role === "score" || body.role === "context" || body.role === "validation") {
      update.role = body.role;
    }
    if (typeof body.variableKey === "string") update.variableKey = body.variableKey.trim();
    if (typeof body.scoreKey === "string") update.scoreKey = body.scoreKey.trim();
    if (body.options != null) {
      const options = normalizeOptions(body.options);
      if (body.type !== "qualitative" && !options.length) {
        return new Response("At least one answer option is required", { status: 400 });
      }
      update.options = options;
    }
    if (body.type === "qualitative") update.options = [];

    await adminDb.collection(COLLECTION).doc(id).update(update);
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "admin.question.update",
      metadata: { questionId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSuperAdmin(request);
    const body = await request.json();
    const id = String(body.id ?? "");
    if (!id) return new Response("Question id is required", { status: 400 });

    await adminDb.collection(COLLECTION).doc(id).delete();
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "admin.question.delete",
      metadata: { questionId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
