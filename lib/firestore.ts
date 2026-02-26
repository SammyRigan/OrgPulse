import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

// Legacy: "questions" - keep for backward compat, new data goes to defaultQuestions
const QUESTIONS_COLLECTION = "questions";
const DEFAULT_QUESTIONS_COLLECTION = "defaultQuestions";
const ORGANIZATIONS_COLLECTION = "organizations";
const CAMPAIGNS_COLLECTION = "campaigns";
const INVITES_COLLECTION = "invites";
const ADMIN_SETTINGS_COLLECTION = "adminSettings";
const ORG_EMAIL_LOOKUP_COLLECTION = "orgEmailLookup";

export type QuestionOption = {
  label: string;
  points: number;
  order?: number;
};

export type FirestoreQuestion = {
  id: string;
  text: string;
  scoreKey: string;
  order: number;
  options: QuestionOption[];
};

export type Organization = {
  id: string;
  name: string;
  thresholdPercent: number;
  useDefaultQuestions: boolean;
  adminUid?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Campaign = {
  id: string;
  orgId: string;
  name: string;
  status: "draft" | "active" | "closed";
  passcode?: string;
  createdAt: Date;
};

export type Invite = {
  id: string;
  orgId: string;
  campaignId: string;
  email: string;
  token: string;
  status: "pending" | "completed";
  expiresAt: Date;
  completedAt?: Date;
  responses?: Record<string, number>;
  passcode?: string;
  createdAt: Date;
};

function snapshotToQuestion(
  d: QueryDocumentSnapshot<DocumentData>
): FirestoreQuestion {
  const data = d.data();
  return {
    id: d.id,
    text: data.text ?? "",
    scoreKey: data.scoreKey ?? "vision",
    order: data.order ?? 0,
    options: Array.isArray(data.options)
      ? (
          data.options as { label: string; points: number; order?: number }[]
        ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : [],
  };
}

/** Get questions - tries defaultQuestions first, falls back to legacy "questions" */
export async function getQuestions(): Promise<FirestoreQuestion[]> {
  const defaultRef = collection(db, DEFAULT_QUESTIONS_COLLECTION);
  const defaultQ = query(defaultRef, orderBy("order", "asc"));
  const defaultSnap = await getDocs(defaultQ);
  if (!defaultSnap.empty) {
    return defaultSnap.docs.map(snapshotToQuestion);
  }
  const legacyRef = collection(db, QUESTIONS_COLLECTION);
  const legacyQ = query(legacyRef, orderBy("order", "asc"));
  const legacySnap = await getDocs(legacyQ);
  return legacySnap.docs.map(snapshotToQuestion);
}

/** Get default questions only */
export async function getDefaultQuestions(): Promise<FirestoreQuestion[]> {
  const ref = collection(db, DEFAULT_QUESTIONS_COLLECTION);
  const q = query(ref, orderBy("order", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(snapshotToQuestion);
}

export async function addDefaultQuestion(data: {
  text: string;
  scoreKey: string;
  options: QuestionOption[];
}): Promise<string> {
  const ref = collection(db, DEFAULT_QUESTIONS_COLLECTION);
  const snapshot = await getDocs(ref);
  const maxOrder = snapshot.docs.reduce(
    (max, d) => Math.max(max, d.data().order ?? 0),
    -1
  );
  const docRef = await addDoc(ref, {
    text: data.text,
    scoreKey: data.scoreKey,
    order: maxOrder + 1,
    options: data.options.map((o, i) => ({
      label: o.label,
      points: o.points,
      order: i,
    })),
  });
  return docRef.id;
}

export async function updateDefaultQuestion(
  id: string,
  data: {
    text?: string;
    scoreKey?: string;
    options?: QuestionOption[];
  }
): Promise<void> {
  const docRef = doc(db, DEFAULT_QUESTIONS_COLLECTION, id);
  const updateData: DocumentData = {};
  if (data.text != null) updateData.text = data.text;
  if (data.scoreKey != null) updateData.scoreKey = data.scoreKey;
  if (data.options != null) {
    updateData.options = data.options.map((o, i) => ({
      label: o.label,
      points: o.points,
      order: i,
    }));
  }
  await updateDoc(docRef, updateData);
}

export async function deleteDefaultQuestion(id: string): Promise<void> {
  const docRef = doc(db, DEFAULT_QUESTIONS_COLLECTION, id);
  await deleteDoc(docRef);
}

// Legacy aliases for backward compat (write to defaultQuestions)
export async function addQuestion(data: {
  text: string;
  scoreKey: string;
  options: QuestionOption[];
}): Promise<string> {
  return addDefaultQuestion(data);
}

export async function updateQuestion(
  id: string,
  data: {
    text?: string;
    scoreKey?: string;
    options?: QuestionOption[];
  }
): Promise<void> {
  return updateDefaultQuestion(id, data);
}

export async function deleteQuestion(id: string): Promise<void> {
  return deleteDefaultQuestion(id);
}

// Organizations
function snapshotToOrg(d: QueryDocumentSnapshot<DocumentData>): Organization {
  const data = d.data();
  return {
    id: d.id,
    name: data.name ?? "",
    thresholdPercent: data.thresholdPercent ?? 80,
    useDefaultQuestions: data.useDefaultQuestions ?? true,
    adminUid: data.adminUid,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  };
}

function snapshotToCampaign(d: QueryDocumentSnapshot<DocumentData>): Campaign {
  const data = d.data();
  return {
    id: d.id,
    orgId: data.orgId ?? "",
    name: data.name ?? "",
    status: data.status ?? "draft",
    passcode: data.passcode ?? undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

function snapshotToInvite(d: QueryDocumentSnapshot<DocumentData>): Invite {
  const data = d.data();
  return {
    id: d.id,
    orgId: data.orgId ?? "",
    campaignId: data.campaignId ?? "",
    email: data.email ?? "",
    token: data.token ?? "",
    status: data.status ?? "pending",
    expiresAt: data.expiresAt?.toDate?.() ?? new Date(),
    completedAt: data.completedAt?.toDate?.() ?? undefined,
    responses: data.responses,
    passcode: data.passcode ?? undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  };
}

export async function getOrganizations(): Promise<Organization[]> {
  const ref = collection(db, ORGANIZATIONS_COLLECTION);
  const snapshot = await getDocs(ref);
  return snapshot.docs
    .map(snapshotToOrg)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getOrganization(id: string): Promise<Organization | null> {
  const docRef = doc(db, ORGANIZATIONS_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snapshotToOrg(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function addOrganization(data: {
  name: string;
  thresholdPercent?: number;
  useDefaultQuestions?: boolean;
  adminUid?: string;
  adminEmail?: string;
}): Promise<string> {
  const ref = collection(db, ORGANIZATIONS_COLLECTION);
  const now = Timestamp.now();
  const docRef = await addDoc(ref, {
    name: data.name,
    thresholdPercent: data.thresholdPercent ?? 80,
    useDefaultQuestions: data.useDefaultQuestions ?? true,
    ...(data.adminUid && { adminUid: data.adminUid }),
    ...(data.adminEmail && { adminEmail: data.adminEmail }),
    createdAt: now,
    updatedAt: now,
  });
  if (data.adminEmail) {
    const lookupRef = doc(db, ORG_EMAIL_LOOKUP_COLLECTION, data.adminEmail.toLowerCase().trim());
    await setDoc(lookupRef, { orgId: docRef.id }, { merge: true });
  }
  return docRef.id;
}

export async function updateOrganization(
  id: string,
  data: {
    name?: string;
    thresholdPercent?: number;
    useDefaultQuestions?: boolean;
  }
): Promise<void> {
  const docRef = doc(db, ORGANIZATIONS_COLLECTION, id);
  const updateData: DocumentData = { updatedAt: Timestamp.now() };
  if (data.name != null) updateData.name = data.name;
  if (data.thresholdPercent != null)
    updateData.thresholdPercent = data.thresholdPercent;
  if (data.useDefaultQuestions != null)
    updateData.useDefaultQuestions = data.useDefaultQuestions;
  await updateDoc(docRef, updateData);
}

export async function deleteOrganization(id: string): Promise<void> {
  const docRef = doc(db, ORGANIZATIONS_COLLECTION, id);
  await deleteDoc(docRef);
}

export async function getOrganizationByAdminUid(
  uid: string
): Promise<Organization | null> {
  const ref = collection(db, ORGANIZATIONS_COLLECTION);
  const q = query(ref, where("adminUid", "==", uid));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshotToOrg(snapshot.docs[0]);
}

/** Check if an email is linked to an organization (for pre-sign-in validation) */
export async function getOrgExistsByAdminEmail(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return false;
  const docRef = doc(db, ORG_EMAIL_LOOKUP_COLLECTION, normalized);
  const snap = await getDoc(docRef);
  return snap.exists();
}

// Campaigns
export async function getCampaignsByOrgId(
  orgId: string
): Promise<Campaign[]> {
  const ref = collection(db, CAMPAIGNS_COLLECTION);
  const q = query(ref, where("orgId", "==", orgId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(snapshotToCampaign);
}

export async function addCampaign(data: {
  orgId: string;
  name: string;
  passcode?: string;
}): Promise<string> {
  const ref = collection(db, CAMPAIGNS_COLLECTION);
  const now = Timestamp.now();
  const docRef = await addDoc(ref, {
    orgId: data.orgId,
    name: data.name,
    status: "active",
    ...(data.passcode && { passcode: data.passcode }),
    createdAt: now,
  });
  return docRef.id;
}

export async function updateCampaign(
  id: string,
  data: { name?: string; status?: string; passcode?: string | null }
): Promise<void> {
  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  const updateData: DocumentData = {};
  if (data.name != null) updateData.name = data.name;
  if (data.status != null) updateData.status = data.status;
  if (data.passcode !== undefined) updateData.passcode = data.passcode || null;
  await updateDoc(docRef, updateData);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const docRef = doc(db, CAMPAIGNS_COLLECTION, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snapshotToCampaign(snap as QueryDocumentSnapshot<DocumentData>);
}

// Invites
export async function getInvitesByCampaign(
  campaignId: string
): Promise<Invite[]> {
  const ref = collection(db, INVITES_COLLECTION);
  const q = query(
    ref,
    where("campaignId", "==", campaignId),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(snapshotToInvite);
}

export async function getInviteByToken(
  token: string
): Promise<Invite | null> {
  const ref = collection(db, INVITES_COLLECTION);
  const q = query(ref, where("token", "==", token));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshotToInvite(snapshot.docs[0]);
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function addInvites(
  orgId: string,
  campaignId: string,
  emails: string[],
  passcode?: string
): Promise<{ email: string; token: string; link: string }[]> {
  const ref = collection(db, INVITES_COLLECTION);
  const now = Timestamp.now();
  const expiresAt = new Date(now.toMillis() + 10 * 24 * 60 * 60 * 1000);
  const results: { email: string; token: string; link: string }[] = [];
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const email of emails) {
    const token = generateToken();
    await addDoc(ref, {
      orgId,
      campaignId,
      email: email.trim().toLowerCase(),
      token,
      status: "pending",
      expiresAt: Timestamp.fromDate(expiresAt),
      ...(passcode && { passcode }),
      createdAt: now,
    });
    results.push({
      email: email.trim(),
      token,
      link: `${baseUrl}/assess?token=${token}`,
    });
  }
  return results;
}

export async function completeInvite(
  inviteId: string,
  responses: Record<string, number>
): Promise<void> {
  const docRef = doc(db, INVITES_COLLECTION, inviteId);
  await updateDoc(docRef, {
    status: "completed",
    responses,
    completedAt: Timestamp.now(),
  });
}

export async function getInviteByTokenForAssessment(
  token: string
): Promise<{ invite: Invite; org: Organization } | null> {
  const invite = await getInviteByToken(token);
  if (!invite) return null;
  const org = await getOrganization(invite.orgId);
  if (!org) return null;
  if (invite.status === "completed") return null;
  if (new Date() > invite.expiresAt) return null;
  return { invite, org };
}

export type AdminSettings = {
  inviteExpiryDays?: number;
  defaultThresholdPercent?: number;
  appName?: string;
};

const ADMIN_SETTINGS_DOC_ID = "main";

export async function getAdminSettings(): Promise<AdminSettings> {
  const docRef = doc(db, ADMIN_SETTINGS_COLLECTION, ADMIN_SETTINGS_DOC_ID);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return {};
  const d = snap.data();
  return {
    inviteExpiryDays: d.inviteExpiryDays ?? 10,
    defaultThresholdPercent: d.defaultThresholdPercent ?? 80,
    appName: d.appName ?? "OrgPulse",
  };
}

export async function updateAdminSettings(data: Partial<AdminSettings>): Promise<void> {
  const docRef = doc(db, ADMIN_SETTINGS_COLLECTION, ADMIN_SETTINGS_DOC_ID);
  await setDoc(docRef, data, { merge: true });
}

/** Aggregate completed responses for a campaign into mean scores */
export function aggregateCampaignResponses(invites: Invite[]): Record<string, number> {
  const completed = invites.filter((i) => i.status === "completed" && i.responses);
  if (completed.length === 0) return { vision: 50, alignment: 50, performance: 50, cohesion: 50, processes: 50, scalability: 50 };
  const keys = ["vision", "alignment", "performance", "cohesion", "processes", "scalability"] as const;
  const result: Record<string, number> = {};
  for (const key of keys) {
    const values = completed
      .map((i) => i.responses?.[key])
      .filter((v): v is number => typeof v === "number");
    result[key] = values.length > 0
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 50;
  }
  return result;
}
