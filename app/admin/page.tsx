"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  DoorOpen,
  Edit2,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Plus,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import {
  ASSESSMENT_QUESTIONS,
  CONTEXT_QUESTIONS,
  QUALITATIVE_QUESTIONS,
  answerToScore,
} from "@/lib/questions";

const SCORE_KEYS = [
  "vision",
  "alignment",
  "performance",
  "cohesion",
  "processes",
  "scalability",
] as const;

const CONTEXT_VARIABLE_KEYS = [
  { value: "infrastructure", label: "Infrastructure stability" },
  { value: "market_volatility", label: "Market volatility" },
  { value: "regulatory_pressure", label: "Regulatory pressure" },
  { value: "resource_constraints", label: "Resource constraints" },
  { value: "customer_pressure", label: "Customer pressure" },
];

const VALIDATION_VARIABLE_KEYS = [
  { value: "decision_consistency", label: "Decision consistency" },
  { value: "leadership_alignment_check", label: "Leadership alignment check" },
  { value: "process_reality_check", label: "Process reality check" },
  { value: "psychological_safety_check", label: "Psychological safety check" },
  { value: "response_consistency_check", label: "Response consistency check" },
];

const QUALITATIVE_VARIABLE_KEYS = [
  { value: "operational_bottleneck", label: "Operational bottleneck" },
  { value: "process_change", label: "Process change" },
  { value: "external_challenge", label: "External challenge" },
  { value: "additional_context", label: "Additional context" },
];

const DEFAULT_OPTIONS = [
  { label: "Strongly Disagree", points: 20 },
  { label: "Disagree", points: 40 },
  { label: "Neutral", points: 60 },
  { label: "Agree", points: 80 },
  { label: "Strongly Agree", points: 100 },
];

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
  const router = useRouter();
  const { user, loading: authChecking, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState<"organizations" | "questions">(
    "organizations"
  );
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [addQuestionForm, setAddQuestionForm] = useState<QuestionForm>({
    type: "quantitative",
    role: "score",
    variableKey: "vision",
    text: "",
    scoreKey: "vision",
    options: DEFAULT_OPTIONS,
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionForm, setEditQuestionForm] = useState<QuestionForm | null>(null);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [addOrgForm, setAddOrgForm] = useState({
    name: "",
    adminEmail: "",
    thresholdPercent: 80,
    useDefaultQuestions: true,
  });
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editOrgForm, setEditOrgForm] = useState<{
    name: string;
    thresholdPercent: number;
    useDefaultQuestions: boolean;
  } | null>(null);
  const [actionError, setActionError] = useState("");

  const authedFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!user) throw new Error("Not signed in");
      const token = await user.getIdToken();
      return fetch(input, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init?.headers,
        },
      });
    },
    [user]
  );

  const fetchOrganizations = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/organizations");
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { organizations: AdminOrganization[] };
      setOrganizations(data.organizations);
    } catch (e) {
      console.error(e);
      setActionError("Could not load organizations.");
    } finally {
      setDataLoading(false);
    }
  }, [authedFetch, user]);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setQuestionsLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/questions");
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as { questions: AdminQuestion[] };
      setQuestions(data.questions);
    } catch (e) {
      console.error(e);
      setActionError("Could not load questions.");
    } finally {
      setQuestionsLoading(false);
    }
  }, [authedFetch, user]);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      return;
    }

    let cancelled = false;
    setCheckingRole(true);
    authedFetch("/api/me")
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ superAdmin: boolean }>;
      })
      .then((me) => {
        if (cancelled) return;
        setIsSuperAdmin(me.superAdmin);
        if (me.superAdmin) {
          fetchOrganizations();
          fetchQuestions();
        }
      })
      .catch(() => {
        if (!cancelled) setIsSuperAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingRole(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authedFetch, fetchOrganizations, fetchQuestions, user]);

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
    setOrganizations([]);
    setQuestions([]);
    setIsSuperAdmin(false);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuestionForm.text.trim()) return;
    setQuestionsLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/questions", {
        method: "POST",
        body: JSON.stringify(addQuestionForm),
      });
      if (!response.ok) throw new Error(await response.text());
      setShowAddQuestion(false);
      setAddQuestionForm({
        type: "quantitative",
        role: "score",
        variableKey: "vision",
        text: "",
        scoreKey: "vision",
        options: DEFAULT_OPTIONS,
      });
      fetchQuestions();
    } catch (e) {
      console.error(e);
      setActionError("Could not add question.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSaveQuestionEdit = async () => {
    if (!editingQuestionId || !editQuestionForm) return;
    setQuestionsLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/questions", {
        method: "PATCH",
        body: JSON.stringify({ id: editingQuestionId, ...editQuestionForm }),
      });
      if (!response.ok) throw new Error(await response.text());
      setEditingQuestionId(null);
      setEditQuestionForm(null);
      fetchQuestions();
    } catch (e) {
      console.error(e);
      setActionError("Could not update question.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    setQuestionsLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/questions", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await response.text());
      fetchQuestions();
    } catch (e) {
      console.error(e);
      setActionError("Could not delete question.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleSeedQuestions = async () => {
    if (questions.length > 0) {
      alert("Questions already exist. Delete them first if you want to reseed.");
      return;
    }
    setQuestionsLoading(true);
    setActionError("");
    try {
      for (const question of ASSESSMENT_QUESTIONS) {
        const response = await authedFetch("/api/admin/questions", {
          method: "POST",
          body: JSON.stringify({
            type: "quantitative",
            role: "score",
            variableKey: question.id,
            text: question.question,
            scoreKey: question.id,
            options: question.options.map((option) => ({
              label: option.label,
              points: answerToScore(option.value),
            })),
          }),
        });
        if (!response.ok) throw new Error(await response.text());
      }
      for (const question of CONTEXT_QUESTIONS) {
        const response = await authedFetch("/api/admin/questions", {
          method: "POST",
          body: JSON.stringify({
            type: "quantitative",
            role: question.role,
            variableKey: question.id,
            text: question.question,
            scoreKey: "vision",
            options: question.options.map((option) => ({
              label: option.label,
              points: answerToScore(option.value),
            })),
          }),
        });
        if (!response.ok) throw new Error(await response.text());
      }
      const qualitativeVariableKeys = [
        "operational_bottleneck",
        "process_change",
        "external_challenge",
      ];
      const qualitativePillars = ["processes", "processes", "scalability"];
      for (const question of QUALITATIVE_QUESTIONS) {
        const qualitativeIndex = QUALITATIVE_QUESTIONS.indexOf(question);
        const response = await authedFetch("/api/admin/questions", {
          method: "POST",
          body: JSON.stringify({
            type: "qualitative",
            role: "context",
            variableKey: qualitativeVariableKeys[qualitativeIndex] ?? "additional_context",
            text: question.question,
            scoreKey: qualitativePillars[qualitativeIndex] ?? "vision",
            options: [],
          }),
        });
        if (!response.ok) throw new Error(await response.text());
      }
      fetchQuestions();
    } catch (e) {
      console.error(e);
      setActionError("Could not seed default questions.");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleAddOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addOrgForm.name.trim()) return;
    setDataLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/organizations", {
        method: "POST",
        body: JSON.stringify(addOrgForm),
      });
      if (!response.ok) throw new Error(await response.text());
      setShowAddOrg(false);
      setAddOrgForm({ name: "", adminEmail: "", thresholdPercent: 80, useDefaultQuestions: true });
      fetchOrganizations();
    } catch (e) {
      console.error(e);
      setActionError("Could not add organization.");
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveOrgEdit = async () => {
    if (!editingOrgId || !editOrgForm) return;
    setDataLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/organizations", {
        method: "PATCH",
        body: JSON.stringify({ id: editingOrgId, ...editOrgForm }),
      });
      if (!response.ok) throw new Error(await response.text());
      setEditingOrgId(null);
      setEditOrgForm(null);
      fetchOrganizations();
    } catch (e) {
      console.error(e);
      setActionError("Could not update organization.");
    } finally {
      setDataLoading(false);
    }
  };

  const handleDeleteOrg = async (id: string) => {
    if (!confirm("Delete this organization? Campaigns and invites will be lost.")) return;
    setDataLoading(true);
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/organizations", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error(await response.text());
      setEditingOrgId(null);
      setEditOrgForm(null);
      fetchOrganizations();
    } catch (e) {
      console.error(e);
      setActionError("Could not delete organization.");
    } finally {
      setDataLoading(false);
    }
  };

  const enterOrganization = async (org: AdminOrganization) => {
    setActionError("");
    try {
      const response = await authedFetch("/api/admin/impersonation", {
        method: "POST",
        body: JSON.stringify({ orgId: org.id, action: "start" }),
      });
      if (!response.ok) throw new Error(await response.text());
      router.push(`/org/dashboard?orgId=${encodeURIComponent(org.id)}&impersonating=1`);
    } catch (e) {
      console.error(e);
      setActionError("Could not enter organization workspace.");
    }
  };

  const updateQuestionOption = (
    form: QuestionForm,
    index: number,
    field: "label" | "points",
    value: string
  ): QuestionForm => ({
    ...form,
    options: form.options.map((option, optionIndex) =>
      optionIndex === index
        ? {
            ...option,
            [field]: field === "points" ? parseInt(value, 10) || 0 : value,
          }
        : option
    ),
  });

  if (authChecking || checkingRole) {
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
            Admin users need a superAdmin claim or must be listed in SUPER_ADMIN_EMAILS.
          </p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <Shield className="mx-auto mb-4 h-10 w-10 text-[#D97706]" />
          <h1 className="text-xl font-bold text-gray-900">Super admin access required</h1>
          <p className="mt-2 text-sm text-gray-500">
            This account is signed in, but it is not authorized to manage the platform.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-6">
          <LayoutDashboard className="h-6 w-6 text-[#D97706]" />
          <span className="font-semibold text-gray-900">OrgPulse Admin</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <button
            type="button"
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
            type="button"
            onClick={() => setActiveSection("questions")}
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm font-medium ${
              activeSection === "questions"
                ? "bg-amber-50 text-[#D97706]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <FileQuestion className="h-4 w-4" />
            Questions
          </button>
          <a
            href="/demo-analysis"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          >
            Demo analysis
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

      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-6xl">
          {actionError && (
            <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </p>
          )}
          {activeSection === "questions" && (
              <section className="mb-10">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Questions
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure the default survey questions organizations use.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSeedQuestions}
                      disabled={questionsLoading || questions.length > 0}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Seed defaults
                    </button>
                    <button
                      onClick={() => setShowAddQuestion(true)}
                      className="flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 font-semibold text-white hover:bg-amber-600"
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </button>
                  </div>
                </div>

                {showAddQuestion && (
                  <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 font-bold text-gray-800">New Question</h2>
                    <form onSubmit={handleAddQuestion} className="space-y-4">
                      <QuestionFormFields
                        form={addQuestionForm}
                        onChange={setAddQuestionForm}
                        updateOption={updateQuestionOption}
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={questionsLoading}
                          className="flex items-center gap-2 rounded-lg bg-[#D97706] px-4 py-2 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddQuestion(false)}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {questionsLoading && !showAddQuestion && !editingQuestionId ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question) => (
                      <div
                        key={question.id}
                        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                      >
                        {editingQuestionId === question.id && editQuestionForm ? (
                          <div className="space-y-4">
                            <QuestionFormFields
                              form={editQuestionForm}
                              onChange={setEditQuestionForm}
                              updateOption={updateQuestionOption}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleSaveQuestionEdit}
                                disabled={questionsLoading}
                                className="rounded-lg bg-[#D97706] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingQuestionId(null);
                                  setEditQuestionForm(null);
                                }}
                                className="rounded-lg border px-3 py-1.5 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="mb-2 flex items-center justify-between gap-4">
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                {question.type === "qualitative" ? "qualitative" : question.scoreKey}
                              </span>
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                {question.role}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setEditingQuestionId(question.id);
                                    setEditQuestionForm({
                                      type: question.type,
                                      role: question.role,
                                      variableKey: question.variableKey ?? question.scoreKey,
                                      text: question.text,
                                      scoreKey: question.scoreKey,
                                      options: question.options.map((option) => ({
                                        label: option.label,
                                        points: option.points,
                                      })),
                                    });
                                  }}
                                  className="rounded p-1 text-gray-500 hover:bg-gray-100"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(question.id)}
                                  className="rounded p-1 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <p className="mb-3 text-gray-800">{question.text}</p>
                            {question.type === "quantitative" ? (
                              <div className="flex flex-wrap gap-2">
                                {question.options.map((option, index) => (
                                  <span
                                    key={`${option.label}-${index}`}
                                    className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                                  >
                                    {option.label} - {option.points}pts
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Free-text response
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {questions.length === 0 && (
                      <p className="rounded-2xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
                        No questions yet. Add one or seed the defaults.
                      </p>
                    )}
                  </div>
                )}
              </section>
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
                        Owner email (optional)
                      </label>
                      <input
                        type="email"
                        value={addOrgForm.adminEmail}
                        onChange={(e) =>
                          setAddOrgForm((p) => ({ ...p, adminEmail: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-4 py-2"
                        placeholder="owner@company.com"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Used for sign-in lookup when the organization owner account exists.
                      </p>
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
                                onClick={() => enterOrganization(org)}
                                className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-[#D97706] hover:bg-amber-100"
                              >
                                <DoorOpen className="h-4 w-4" />
                                Enter workspace
                              </button>
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
                            <span className="rounded bg-gray-100 px-2 py-0.5">
                              {org.campaignCount} campaigns
                            </span>
                            <span className="rounded bg-gray-100 px-2 py-0.5">
                              {org.completedCount}/{org.inviteCount} responses
                            </span>
                            {org.adminEmail && (
                              <span className="rounded bg-gray-100 px-2 py-0.5">
                                {org.adminEmail}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-gray-500">
                            Super-admin workspace entry is audited and does not switch Firebase users.
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

type AdminOrganization = {
  id: string;
  name: string;
  thresholdPercent: number;
  useDefaultQuestions: boolean;
  adminEmail?: string;
  campaignCount: number;
  inviteCount: number;
  completedCount: number;
};

type AdminQuestion = {
  id: string;
  type: "quantitative" | "qualitative";
  role: "score" | "context" | "validation";
  variableKey?: string;
  text: string;
  scoreKey: string;
  order: number;
  options: { label: string; points: number; order?: number }[];
};

type QuestionForm = {
  type: "quantitative" | "qualitative";
  role: "score" | "context" | "validation";
  variableKey: string;
  text: string;
  scoreKey: string;
  options: { label: string; points: number }[];
};

function getBaseVariableKeyOptions(form: QuestionForm) {
  return form.type === "qualitative"
    ? QUALITATIVE_VARIABLE_KEYS
    : form.role === "validation"
      ? VALIDATION_VARIABLE_KEYS
      : form.role === "context"
        ? CONTEXT_VARIABLE_KEYS
        : SCORE_KEYS.map((key) => ({ value: key, label: key }));
}

function getVariableKeyOptions(form: QuestionForm) {
  const options = getBaseVariableKeyOptions(form);

  if (!form.variableKey || options.some((option) => option.value === form.variableKey)) {
    return options;
  }

  return [{ value: form.variableKey, label: `${form.variableKey} (existing)` }, ...options];
}

function getDefaultVariableKey(form: QuestionForm) {
  return getBaseVariableKeyOptions(form)[0].value;
}

function QuestionFormFields({
  form,
  onChange,
  updateOption,
}: {
  form: QuestionForm;
  onChange: (form: QuestionForm) => void;
  updateOption: (
    form: QuestionForm,
    index: number,
    field: "label" | "points",
    value: string
  ) => QuestionForm;
}) {
  const variableKeyOptions = getVariableKeyOptions(form);

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Question text
        </label>
        <input
          type="text"
          value={form.text}
          onChange={(e) => onChange({ ...form, text: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
          placeholder="Enter question..."
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Question type
        </label>
        <select
          value={form.type}
          onChange={(e) => {
            const nextType =
              e.target.value === "qualitative" ? "qualitative" : "quantitative";
            const nextRole = nextType === "qualitative" ? "context" : form.role;
            const nextVariableKey =
              nextType === "qualitative"
                ? QUALITATIVE_VARIABLE_KEYS[0].value
                : getDefaultVariableKey({ ...form, type: nextType, role: nextRole });
            onChange({
              ...form,
              type: nextType,
              role: nextRole,
              variableKey: nextVariableKey,
              scoreKey: nextRole === "score" ? nextVariableKey : form.scoreKey,
            });
          }}
          className="w-full rounded-lg border border-gray-300 px-4 py-2"
        >
          <option value="quantitative">Quantitative (scored)</option>
          <option value="qualitative">Qualitative (free text)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Question purpose
        </label>
        <select
          value={form.role}
          onChange={(e) => {
            const nextRole =
              e.target.value === "context" || e.target.value === "validation"
                ? e.target.value
                : "score";
            const nextVariableKey = getDefaultVariableKey({
              ...form,
              role: nextRole,
            });
            onChange({
              ...form,
              role: nextRole,
              variableKey: nextVariableKey,
              scoreKey: nextRole === "score" ? nextVariableKey : form.scoreKey,
            });
          }}
          disabled={form.type === "qualitative"}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="score">Core score</option>
          <option value="context">Context variable</option>
          <option value="validation">Validation check</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Context and validation questions are collected for interpretation but do not change the six-pillar score.
        </p>
      </div>
      {form.type === "quantitative" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Variable key
            </label>
            <select
              value={form.variableKey}
              onChange={(e) =>
                onChange({
                  ...form,
                  variableKey: e.target.value,
                  scoreKey: form.role === "score" ? e.target.value : form.scoreKey,
                })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            >
              {variableKeyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {form.role === "score"
                ? "Core-score variables map directly to report pillars."
                : "Context and validation variables are predefined for cleaner reporting."}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Answer options
            </label>
            <div className="space-y-2">
              {form.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option.label}
                    onChange={(e) => onChange(updateOption(form, index, "label", e.target.value))}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    placeholder="Label"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={option.points}
                    onChange={(e) => onChange(updateOption(form, index, "points", e.target.value))}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {form.type === "qualitative" && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Associated pillar
            </label>
            <select
              value={form.scoreKey}
              onChange={(e) => onChange({ ...form, scoreKey: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            >
              {SCORE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This groups the qualitative response under a pillar without changing that pillar&apos;s score.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Variable key
            </label>
            <select
              value={form.variableKey}
              onChange={(e) => onChange({ ...form, variableKey: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2"
            >
              {variableKeyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Qualitative prompts collect free-text responses and are not included in the numeric score.
          </p>
        </>
      )}
    </>
  );
}
