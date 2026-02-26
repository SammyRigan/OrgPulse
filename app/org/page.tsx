"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import {
  getOrganizationByAdminUid,
  addOrganization,
  getOrgExistsByAdminEmail,
} from "@/lib/firestore";

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

export default function OrgPage() {
  const router = useRouter();
  const { user, loading: authChecking } = useAuth();
  const [view, setView] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orgCheckDone, setOrgCheckDone] = useState(false);
  const [emailLinked, setEmailLinked] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [signupEmailInUse, setSignupEmailInUse] = useState<boolean | null>(null);
  const [checkingSignupEmail, setCheckingSignupEmail] = useState(false);
  useEffect(() => {
    if (view !== "signup") {
      setSignupEmailInUse(null);
      setCheckingSignupEmail(false);
      return;
    }
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      setSignupEmailInUse(null);
      return;
    }
    let cancelled = false;
    setCheckingSignupEmail(true);
    setSignupEmailInUse(null);
    Promise.allSettled([
      getOrgExistsByAdminEmail(emailTrimmed),
      fetchSignInMethodsForEmail(auth, emailTrimmed),
    ])
      .then(([r1, r2]) => {
        if (cancelled) return;
        const orgExists = r1.status === "fulfilled" ? r1.value : false;
        const methods = r2.status === "fulfilled" ? r2.value : [];
        setSignupEmailInUse(orgExists || methods.length > 0);
      })
      .finally(() => {
        if (!cancelled) setCheckingSignupEmail(false);
      });
    return () => { cancelled = true; };
  }, [email, view]);

  useEffect(() => {
    if (view !== "signin") {
      setEmailLinked(null);
      setCheckingEmail(false);
      return;
    }
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      setEmailLinked(null);
      return;
    }
    let cancelled = false;
    setCheckingEmail(true);
    setEmailLinked(null);
    getOrgExistsByAdminEmail(emailTrimmed)
      .then((exists) => {
        if (!cancelled) setEmailLinked(exists);
      })
      .catch(() => {
        if (!cancelled) setEmailLinked(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingEmail(false);
      });
    return () => { cancelled = true; };
  }, [email, view]);

  useEffect(() => {
    if (!authChecking && user) {
      setOrgCheckDone(false);
      getOrganizationByAdminUid(user.uid)
        .then((org) => {
          if (org) router.replace("/org/dashboard");
          else setOrgCheckDone(true);
        })
        .catch(() => setOrgCheckDone(true));
    } else if (!user) {
      setOrgCheckDone(false);
    }
  }, [user, authChecking, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const org = await getOrganizationByAdminUid(cred.user.uid);
      if (org) router.replace("/org/dashboard");
      else setAuthError("No organization found for this account.");
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage((err as { code?: string })?.code ?? ""));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!orgName.trim()) {
      setAuthError("Organization name is required.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await addOrganization({
        name: orgName.trim(),
        thresholdPercent: 80,
        useDefaultQuestions: true,
        adminUid: cred.user.uid,
        adminEmail: email.trim().toLowerCase(),
      });
      router.replace("/org/dashboard");
    } catch (err: unknown) {
      setAuthError(getAuthErrorMessage((err as { code?: string })?.code ?? ""));
    } finally {
      setSubmitting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
      </div>
    );
  }

  if (user && !orgCheckDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
      </div>
    );
  }

  if (user && orgCheckDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">No organization found</h2>
          <p className="mt-2 text-gray-500">
            This account is not linked to an organization. Sign out and create a new
            organization, or use an account that has one.
          </p>
          <button
            onClick={async () => {
              const { signOut } = await import("firebase/auth");
              await signOut(auth);
            }}
            className="mt-6 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            OrgPulse for <span className="text-[#D97706]">Organizations</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in or create your organization to run assessments
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {view === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Sign in</h2>
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
                  required
                />
                {checkingEmail && <p className="mt-1 text-xs text-gray-500">Checking...</p>}
                {!checkingEmail && emailLinked === false && email.trim().includes("@") && (
                  <p className="mt-1 text-sm text-amber-600">
                    This email is not linked to any organization.
                  </p>
                )}
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
                  required
                />
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              <button
                type="submit"
                disabled={submitting || checkingEmail || emailLinked === false || (email.trim().includes("@") && emailLinked === null)}
                className="w-full rounded-lg bg-[#D97706] py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Sign in"}
              </button>
              <p className="text-center text-sm text-gray-500">
                New organization?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("signup");
                    setAuthError("");
                  }}
                  className="font-medium text-[#D97706] hover:underline"
                >
                  Create account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Create organization
              </h2>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Organization name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    setAuthError("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  placeholder="Acme Inc."
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Admin email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAuthError("");
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
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
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              {authError && <p className="text-sm text-red-600">{authError}</p>}
              {(checkingSignupEmail || signupEmailInUse === true) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {checkingSignupEmail && "Checking if email is available..."}
                  {!checkingSignupEmail && signupEmailInUse === true && "This email is already registered or linked to an organization. Sign in instead."}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || checkingSignupEmail || signupEmailInUse === true}
                className="w-full rounded-lg bg-[#D97706] py-2.5 font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create organization"}
              </button>
              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    setAuthError("");
                  }}
                  className="font-medium text-[#D97706] hover:underline"
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
