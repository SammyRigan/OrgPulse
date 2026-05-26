import "server-only";

import { type DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "./firebaseAdmin";

export type AuthContext = {
  uid: string;
  email?: string;
  role?: string;
  superAdmin: boolean;
  token: DecodedIdToken;
};

function getAllowedAdminEmails(): string[] {
  return (process.env.SUPER_ADMIN_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const decoded = await adminAuth.verifyIdToken(token);
  const email = decoded.email?.toLowerCase();
  const role = typeof decoded.role === "string" ? decoded.role : undefined;
  const envAdmin = email ? getAllowedAdminEmails().includes(email) : false;
  const superAdmin =
    decoded.superAdmin === true || decoded.admin === true || role === "superAdmin" || envAdmin;

  return {
    uid: decoded.uid,
    email,
    role,
    superAdmin,
    token: decoded,
  };
}

export async function requireAuthContext(request: Request): Promise<AuthContext> {
  const auth = await getAuthContext(request);
  if (!auth) throw new Response("Unauthorized", { status: 401 });
  return auth;
}

export async function requireSuperAdmin(request: Request): Promise<AuthContext> {
  const auth = await requireAuthContext(request);
  if (!auth.superAdmin) throw new Response("Forbidden", { status: 403 });
  return auth;
}

export async function resolveAccessibleOrgId(
  request: Request,
  requestedOrgId?: string | null
): Promise<{ auth: AuthContext; orgId: string; impersonating: boolean }> {
  const auth = await requireAuthContext(request);

  if (requestedOrgId) {
    if (auth.superAdmin) {
      return { auth, orgId: requestedOrgId, impersonating: true };
    }

    const orgSnap = await adminDb.collection("organizations").doc(requestedOrgId).get();
    if (!orgSnap.exists || orgSnap.get("adminUid") !== auth.uid) {
      throw new Response("Forbidden", { status: 403 });
    }
    return { auth, orgId: requestedOrgId, impersonating: false };
  }

  const owned = await adminDb
    .collection("organizations")
    .where("adminUid", "==", auth.uid)
    .limit(1)
    .get();

  if (owned.empty) throw new Response("Organization not found", { status: 404 });
  return { auth, orgId: owned.docs[0].id, impersonating: false };
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof Response) return error;
  console.error(error);
  return new Response("Internal Server Error", { status: 500 });
}
