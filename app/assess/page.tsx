"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import AssessmentForm from "@/components/AssessmentForm";
import type { AnswerSummary } from "@/components/AssessmentForm";
import {
  getInviteByTokenForAssessment,
  completeInvite,
} from "@/lib/firestore";
import type { Scores } from "@/lib/utils";

function AssessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "invalid" | "passcode" | "ready" | "submitting" | "done"
  >("loading");
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [expectedPasscode, setExpectedPasscode] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [answerSummary, setAnswerSummary] = useState<AnswerSummary | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    getInviteByTokenForAssessment(token)
      .then((data) => {
        if (!data) {
          setStatus("invalid");
          return;
        }
        setInviteId(data.invite.id);
        setOrgName(data.org.name);
        if (data.invite.passcode) {
          setExpectedPasscode(data.invite.passcode);
          setStatus("passcode");
        } else {
          setStatus("ready");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedPasscode) return;
    if (passcodeInput.trim() === expectedPasscode) {
      setPasscodeError("");
      setStatus("ready");
    } else {
      setPasscodeError("Incorrect passcode. Please try again.");
    }
  };

  const handleSubmit = async (formScores: Scores, summary?: AnswerSummary) => {
    if (!inviteId) return;
    setStatus("submitting");
    try {
      await completeInvite(inviteId, formScores);
      setAnswerSummary(summary ?? null);
      setStatus("done");
    } catch {
      setStatus("ready");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
      </div>
    );
  }

  if (status === "passcode" && expectedPasscode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-center text-lg font-semibold text-gray-900">
            {orgName} – Health Check
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Enter the passcode provided by your organization to continue.
          </p>
          <form onSubmit={handlePasscodeSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Passcode
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => {
                  setPasscodeInput(e.target.value);
                  setPasscodeError("");
                }}
                autoComplete="one-time-code"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#D97706] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                placeholder="Enter passcode"
              />
              {passcodeError && <p className="mt-1 text-sm text-red-600">{passcodeError}</p>}
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#D97706] py-2.5 font-semibold text-white hover:bg-amber-600"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Invalid or expired link</h2>
          <p className="mt-2 text-gray-500">
            This assessment link is invalid, has expired, or has already been completed.
            Please request a new link from your organization.
          </p>
        </div>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="min-h-screen p-4 md:p-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
              {orgName} – <span className="text-[#D97706]">Health Check</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl font-medium text-gray-500">
              Answer the questions below. Your responses are confidential and help your
              organization understand its health.
            </p>
          </header>
          <AssessmentForm onSubmit={handleSubmit} />
        </div>
      </div>
    );
  }

  if (status === "submitting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Submitting your responses...</p>
      </div>
    );
  }

  if (status !== "done") return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Thank you for completing the assessment
              </h1>
              <p className="mt-1 text-gray-500">
                Your responses have been recorded for {orgName}.
              </p>
            </div>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Your organization will generate the analysis once enough people have responded.
          </p>
          {answerSummary && answerSummary.length > 0 && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Summary of your answers
              </h2>
              <ul className="space-y-2">
                {answerSummary.map((item, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-gray-800">{item.question}</span>
                    <span className="block text-gray-600">{item.answer}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D97706] border-t-transparent" />
        </div>
      }
    >
      <AssessContent />
    </Suspense>
  );
}
