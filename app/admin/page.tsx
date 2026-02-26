"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  LogOut,
  Save,
  X,
  LayoutDashboard,
  FileQuestion,
  Building2,
  User,
  Settings,
} from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import {
  getDefaultQuestions,
  addDefaultQuestion,
  updateDefaultQuestion,
  deleteDefaultQuestion,
  getOrganizations,
  addOrganization,
  updateOrganization,
  deleteOrganization,
  getAdminSettings,
  updateAdminSettings,
  type FirestoreQuestion,
  type Organization,
  type AdminSettings,
} from "@/lib/firestore";
import { ASSESSMENT_QUESTIONS } from "@/lib/questions";

const SCORE_KEYS = [
  "vision",
  "alignment",
  "performance",
  "cohesion",
  "processes",
  "scalability",
] as const;

function getAuthErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-email": "Invalid email address.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/email-already-in-use": "This email is already registered.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
  };
  return messages[code] ?? "An error occurred. Please try again.";
}

export default function AdminPage() {
  const { user, loading: authChecking, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [questions, setQuestions] = useState<FirestoreQuestion[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    text: string;
    scoreKey: string;
    options: { label: string; points: number }[];
  } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "questions" | "organizations" | "profile" | "settings"
  >("questions");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [addOrgForm, setAddOrgForm] = useState({
    name: "",
    thresholdPercent: 80,
    useDefaultQuestions: true,
  });
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editOrgForm, setEditOrgForm] = useState<{
    name: string;
    thresholdPercent: number;
    useDefaultQuestions: boolean;
  } | null>(null);

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({});
  const [settingsForm, setSettingsForm] = useState({
    inviteExpiryDays: 10,
    defaultThresholdPercent: 80,
    appName: "OrgPulse",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [addForm, setAddForm] = useState({
    text: "",
    scoreKey: "vision",
    options: [
      { label: "Strongly Disagree", points: 20 },
      { label: "Disagree", points: 40 },
      { label: "Neutral", points: 60 },
      { label: "Agree", points: 80 },
      { label: "Strongly Agree", points: 100 },
    ],
  });

  const fetchQuestions = useCallback(async () => {
    setDataLoading(true);
    try {
      const data = await getDefaultQuestions();
      setQuestions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    setDataLoading(true);
    try {
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const fetchAdminSettings = useCallback(async () => {
    try {
      const s = await getAdminSettings();
      setAdminSettings(s);
      setSettingsForm({
        inviteExpiryDays: s.inviteExpiryDays ?? 10,
        defaultThresholdPercent: s.defaultThresholdPercent ?? 80,
        appName: s.appName ?? "OrgPulse",
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchQuestions();
      fetchOrganizations();
      fetchAdminSettings();
    }
  }, [user, fetchQuestions, fetchOrganizations, fetchAdminSettings]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      setAuthError(getAuthErrorMessage(code));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setQuestions([]);
    setOrganizations([]);
    setEditingId(null);
    setEditForm(null);
    setShowAdd(false);
  };

  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addOrgForm.name.trim()) return;
    setDataLoading(true);
    try {
      await addOrganization(addOrgForm);
      setShowAddOrg(false);
      setAddOrgForm({ name: "", thresholdPercent: 80, useDefaultQuestions: true });
      fetchOrganizations();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveOrgEdit = async () => {
    if (!editingOrgId || !editOrgForm) return;
    setDataLoading(true);
    try {
      await updateOrganization(editingOrgId, editOrgForm);
      setEditingOrgId(null);
      setEditOrgForm(null);
      fetchOrganizations();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm("Delete this organization? Campaigns and invites will be lost.")) return;
    setDataLoading(true);
    try {
      await deleteOrganization(id);
      setEditingOrgId(null);
      setEditOrgForm(null);
      fetchOrganizations();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;
    setDataLoading(true);
    try {
      await updateDefaultQuestion(editingId, editForm);
      setEditingId(null);
      setEditForm(null);
      fetchQuestions();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.text.trim()) return;
    setDataLoading(true);
    try {
      await addDefaultQuestion(addForm);
      setShowAdd(false);
      setAddForm({
        text: "",
        scoreKey: "vision",
        options: [
          { label: "Strongly Disagree", points: 20 },
          { label: "Disagree", points: 40 },
          { label: "Neutral", points: 60 },
          { label: "Agree", points: 80 },
          { label: "Strongly Agree", points: 100 },
        ],
      });
      fetchQuestions();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (
      !confirm(
        "Add default questions? This will create 6 questions if the collection is empty."
      )
    )
      return;
    setDataLoading(true);
    try {
      const existing = await getDefaultQuestions();
      if (existing.length > 0) {
        alert("Questions already exist. Clear them first if you want to reseed.");
        return;
      }
      for (const q of ASSESSMENT_QUESTIONS) {
        await addDefaultQuestion({
          text: q.question,
          scoreKey: q.id,
          options: q.options.map((o, i) => ({
            label: o.label,
            points: [20, 40, 60, 80, 100][i] ?? 50,
          })),
        });
      }
      fetchQuestions();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await updateAdminSettings({
        inviteExpiryDays: settingsForm.inviteExpiryDays,
        defaultThresholdPercent: settingsForm.defaultThresholdPercent,
        appName: settingsForm.appName,
      });
      setAdminSettings(settingsForm);
    } catch (e) {
      console.error(e);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    setDataLoading(true);
    try {
      await deleteDefaultQuestion(id);
      fetchQuestions();
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoading(false);
    }
  };

  const updateOptionPoints = (
    opts: { label: string; points: number }[],
    index: number,
    points: number
  ) => {
    const next = [...opts];
    next[index] = { ...next[index], points };
    return next;
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">OrgPulse Admin</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to access the admin dashboard
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <form onSubmit={handleSignIn} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Sign in
                </h2>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setAuthError("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setAuthError("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {authError && (
                  <p className="text-sm text-red-600">{authError}</p>
                )}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-lg bg-[#D97706] py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {authLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            Admin users are managed in Firebase Console → Authentication → Users
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
          <LayoutDashboard className="h-6 w-6 text-[#D97706]" />
          <span className="font-semibold text-gray-900">OrgPulse Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <button
            onClick={() => setActiveSection("questions")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium ${
              activeSection === "questions"
                ? "bg-amber-50 text-[#D97706]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            Default Questions
          </button>
          <button
            onClick={() => setActiveSection("organizations")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium ${
              activeSection === "organizations"
                ? "bg-amber-50 text-[#D97706]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Organizations
          </button>
          <button
            onClick={() => setActiveSection("profile")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium ${
              activeSection === "profile"
                ? "bg-amber-50 text-[#D97706]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <User className="h-4 w-4" />
            Admin Profile
          </button>
          <button
            onClick={() => setActiveSection("settings")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium ${
              activeSection === "settings"
                ? "bg-amber-50 text-[#D97706]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Settings className="h-4 w-4" />
            App Settings
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            View Assessment
          </a>
        </nav>
        <div className="border-t border-gray-100 p-4">
          <div className="mb-2 truncate px-4 text-xs text-gray-500">
            {user.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-4xl">
          {activeSection === "questions" && (
            <>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Default Questions
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Used by organizations with &quot;Use default questions&quot; enabled
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 font-semibold text-white hover:bg-amber-600"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </button>
                  <button
                    onClick={handleSeedDefaults}
                    disabled={dataLoading || questions.length > 0}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Seed defaults
                  </button>
                </div>
              </div>

              {showAdd && (
            <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-bold text-gray-800">New Question</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Question text
                  </label>
                  <input
                    type="text"
                    value={addForm.text}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, text: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                    placeholder="Enter question..."
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Score key (radar metric)
                  </label>
                  <select
                    value={addForm.scoreKey}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, scoreKey: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  >
                    {SCORE_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Answer options (assign points 0–100)
                  </label>
                  <div className="space-y-2">
                    {addForm.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={opt.label}
                          onChange={(e) => {
                            const next = [...addForm.options];
                            next[i] = { ...next[i], label: e.target.value };
                            setAddForm((p) => ({ ...p, options: next }));
                          }}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                          placeholder="Label"
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={opt.points}
                          onChange={(e) => {
                            const next = updateOptionPoints(
                              addForm.options,
                              i,
                              parseInt(e.target.value, 10) || 0
                            );
                            setAddForm((p) => ({ ...p, options: next }));
                          }}
                          className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={dataLoading}
                    className="flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {dataLoading && !editingId && !showAdd ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  {editingId === q.id && editForm ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editForm.text}
                        onChange={(e) =>
                          setEditForm((p) =>
                            p ? { ...p, text: e.target.value } : null
                          )
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2"
                      />
                      <select
                        value={editForm.scoreKey}
                        onChange={(e) =>
                          setEditForm((p) =>
                            p ? { ...p, scoreKey: e.target.value } : null
                          )
                        }
                        className="rounded-lg border border-gray-300 px-4 py-2"
                      >
                        {SCORE_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                      <div className="space-y-2">
                        {editForm.options.map((opt, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              type="text"
                              value={opt.label}
                              onChange={(e) => {
                                const next = [...editForm.options];
                                next[i] = { ...next[i], label: e.target.value };
                                setEditForm((p) =>
                                  p ? { ...p, options: next } : null
                                );
                              }}
                              className="flex-1 rounded border px-2 py-1 text-sm"
                            />
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={opt.points}
                              onChange={(e) =>
                                setEditForm((p) =>
                                  p
                                    ? {
                                        ...p,
                                        options: updateOptionPoints(
                                          editForm.options,
                                          i,
                                          parseInt(e.target.value, 10) || 0
                                        ),
                                      }
                                    : null
                                )
                              }
                              className="w-20 rounded border px-2 py-1 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={dataLoading}
                          className="flex items-center gap-1 rounded-lg bg-[#D97706] px-3 py-1.5 text-sm font-semibold text-white"
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                          className="rounded-lg border px-3 py-1.5 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {q.scoreKey}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingId(q.id);
                              setEditForm({
                                text: q.text,
                                scoreKey: q.scoreKey,
                                options: q.options.map((o) => ({
                                  label: o.label,
                                  points: o.points,
                                })),
                              });
                            }}
                            className="rounded p-1 text-gray-500 hover:bg-gray-100"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(q.id)}
                            className="rounded p-1 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mb-3 text-gray-800">{q.text}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map((o, i) => (
                          <span
                            key={i}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {o.label} → {o.points}pts
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
            </>
          )}

          {activeSection === "profile" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h1 className="mb-6 text-2xl font-bold text-gray-900">
                Admin Profile
              </h1>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900">
                    {user?.email ?? "—"}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  To change your password or update your profile, use Firebase Console
                  → Authentication → Users.
                </p>
              </div>
            </div>
          )}

          {activeSection === "settings" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h1 className="mb-6 text-2xl font-bold text-gray-900">
                App Settings
              </h1>
              <form onSubmit={handleSaveSettings} className="max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    App name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.appName}
                    onChange={(e) =>
                      setSettingsForm((p) => ({ ...p, appName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Invite expiry (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={settingsForm.inviteExpiryDays}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        inviteExpiryDays: parseInt(e.target.value, 10) || 10,
                      }))
                    }
                    className="w-24 rounded-lg border border-gray-300 px-4 py-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Invite links expire after this many days
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Default completion threshold (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={settingsForm.defaultThresholdPercent}
                    onChange={(e) =>
                      setSettingsForm((p) => ({
                        ...p,
                        defaultThresholdPercent: parseInt(e.target.value, 10) || 80,
                      }))
                    }
                    className="w-24 rounded-lg border border-gray-300 px-4 py-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Used when creating new organizations
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="rounded-lg bg-[#D97706] px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {settingsSaving ? "Saving..." : "Save settings"}
                </button>
              </form>
            </div>
          )}

          {activeSection === "organizations" && (
            <>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Organizations
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Client organizations receive invites and run assessment campaigns
                  </p>
                </div>
                <button
                  onClick={() => setShowAddOrg(true)}
                  className="flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 font-semibold text-white hover:bg-amber-600"
                >
                  <Plus className="h-4 w-4" />
                  Add Organization
                </button>
              </div>

              {showAddOrg && (
                <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 font-bold text-gray-800">New Organization</h2>
                  <form onSubmit={handleAddOrg} className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <input
                        type="text"
                        value={addOrgForm.name}
                        onChange={(e) =>
                          setAddOrgForm((p) => ({ ...p, name: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2"
                        placeholder="Acme Inc."
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Completion threshold (%)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={addOrgForm.thresholdPercent}
                        onChange={(e) =>
                          setAddOrgForm((p) => ({
                            ...p,
                            thresholdPercent: parseInt(e.target.value, 10) || 80,
                          }))
                        }
                        className="w-24 rounded-lg border border-gray-300 px-4 py-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Analysis generates when this % of invitees complete
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="useDefaultQuestions"
                        checked={addOrgForm.useDefaultQuestions}
                        onChange={(e) =>
                          setAddOrgForm((p) => ({
                            ...p,
                            useDefaultQuestions: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="useDefaultQuestions" className="text-sm text-gray-700">
                        Use default questions (uncheck to set custom questions per org later)
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={dataLoading}
                        className="rounded-lg bg-[#D97706] px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddOrg(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {dataLoading && !editingOrgId && !showAddOrg ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-4">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                    >
                      {editingOrgId === org.id && editOrgForm ? (
                        <div className="space-y-4">
                          <input
                            type="text"
                            value={editOrgForm.name}
                            onChange={(e) =>
                              setEditOrgForm((p) =>
                                p ? { ...p, name: e.target.value } : null
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-4 py-2"
                          />
                          <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                              Threshold (%)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={editOrgForm.thresholdPercent}
                              onChange={(e) =>
                                setEditOrgForm((p) =>
                                  p
                                    ? {
                                        ...p,
                                        thresholdPercent:
                                          parseInt(e.target.value, 10) || 80,
                                      }
                                    : null
                                )
                              }
                              className="w-24 rounded-lg border border-gray-300 px-4 py-2"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editOrgForm.useDefaultQuestions}
                              onChange={(e) =>
                                setEditOrgForm((p) =>
                                  p
                                    ? {
                                        ...p,
                                        useDefaultQuestions: e.target.checked,
                                      }
                                    : null
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">
                              Use default questions
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveOrgEdit}
                              disabled={dataLoading}
                              className="rounded-lg bg-[#D97706] px-3 py-1.5 text-sm font-semibold text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingOrgId(null);
                                setEditOrgForm(null);
                              }}
                              className="rounded-lg border px-3 py-1.5 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{org.name}</h3>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingOrgId(org.id);
                                  setEditOrgForm({
                                    name: org.name,
                                    thresholdPercent: org.thresholdPercent,
                                    useDefaultQuestions: org.useDefaultQuestions,
                                  });
                                }}
                                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrg(org.id)}
                                className="rounded p-1 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                            <span className="rounded bg-gray-100 px-2 py-0.5">
                              {org.thresholdPercent}% threshold
                            </span>
                            <span className="rounded bg-gray-100 px-2 py-0.5">
                              {org.useDefaultQuestions ? "Default questions" : "Custom questions"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Organizations manage their own campaigns via /org
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
