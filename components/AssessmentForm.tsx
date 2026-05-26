"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getQuestions } from "@/lib/firestore";
import {
  ASSESSMENT_QUESTIONS,
  CONTEXT_QUESTIONS,
  QUALITATIVE_QUESTIONS,
  answerToScore,
  answersToScores,
} from "@/lib/questions";
import type { Scores } from "@/lib/utils";
import type { ScoreKey } from "@/lib/questions";

const FALLBACK_QUALITATIVE_VARIABLE_KEYS = [
  "operational_bottleneck",
  "process_change",
  "external_challenge",
];

const FALLBACK_QUALITATIVE_PILLARS = ["processes", "processes", "scalability"];

type CmsQuestion = {
  id: string;
  type: "quantitative" | "qualitative";
  role: "score" | "context" | "validation";
  variableKey: string;
  question: string;
  scoreKey: string;
  options: { label: string; points: number }[];
};

export type AnswerSummary = {
  type: "quantitative" | "qualitative";
  question: string;
  answer: string;
}[];

export type QualitativeResponses = Record<
  string,
  { question: string; answer: string; scoreKey: string; variableKey: string }
>;
export type DiagnosticResponses = Record<
  string,
  {
    question: string;
    role: "context" | "validation";
    variableKey: string;
    score: number;
    answer: string;
  }
>;

interface AssessmentFormProps {
  onSubmit: (
    scores: Scores,
    summary?: AnswerSummary,
    qualitativeResponses?: QualitativeResponses,
    diagnosticResponses?: DiagnosticResponses
  ) => void;
}

function toCmsQuestion(q: {
  id: string;
  text: string;
  type?: "quantitative" | "qualitative";
  role?: "score" | "context" | "validation";
  variableKey?: string;
  scoreKey: string;
  options: { label: string; points: number }[];
}): CmsQuestion {
  return {
    id: q.id,
    type: q.type ?? (q.options.length > 0 ? "quantitative" : "qualitative"),
    role: q.role ?? (q.type === "qualitative" ? "context" : "score"),
    variableKey: q.variableKey ?? q.scoreKey ?? q.id,
    question: q.text,
    scoreKey: q.scoreKey,
    options: q.options,
  };
}

export default function AssessmentForm({ onSubmit }: AssessmentFormProps) {
  const [questions, setQuestions] = useState<CmsQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, number>>>({});
  const [qualitativeAnswers, setQualitativeAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    getQuestions()
      .then((data) => {
        if (data.length > 0) {
          setQuestions(data.map(toCmsQuestion));
        } else {
          setQuestions(
            [
              ...ASSESSMENT_QUESTIONS.map((q) => ({
                id: q.id,
                type: "quantitative" as const,
                role: "score" as const,
                variableKey: q.id,
                question: q.question,
                scoreKey: q.id,
                options: q.options.map((o) => ({
                  label: o.label,
                  points: answerToScore(o.value),
                })),
              })),
              ...CONTEXT_QUESTIONS.map((q) => ({
                id: q.id,
                type: "quantitative" as const,
                role: q.role,
                variableKey: q.id,
                question: q.question,
                scoreKey: "vision",
                options: q.options.map((o) => ({
                  label: o.label,
                  points: answerToScore(o.value),
                })),
              })),
              ...QUALITATIVE_QUESTIONS.map((q) => ({
                id: q.id,
                type: "qualitative" as const,
                role: "context" as const,
                variableKey:
                  FALLBACK_QUALITATIVE_VARIABLE_KEYS[
                    QUALITATIVE_QUESTIONS.indexOf(q)
                  ] ?? "additional_context",
                question: q.question,
                scoreKey:
                  FALLBACK_QUALITATIVE_PILLARS[QUALITATIVE_QUESTIONS.indexOf(q)] ??
                  "vision",
                options: [],
              })),
            ]
          );
        }
      })
      .catch(() => {
        setQuestions(
          [
            ...ASSESSMENT_QUESTIONS.map((q) => ({
              id: q.id,
              type: "quantitative" as const,
              role: "score" as const,
              variableKey: q.id,
              question: q.question,
              scoreKey: q.id,
              options: q.options.map((o) => ({
                label: o.label,
                points: answerToScore(o.value),
              })),
            })),
            ...CONTEXT_QUESTIONS.map((q) => ({
              id: q.id,
              type: "quantitative" as const,
              role: q.role,
              variableKey: q.id,
              question: q.question,
              scoreKey: "vision",
              options: q.options.map((o) => ({
                label: o.label,
                points: answerToScore(o.value),
              })),
            })),
            ...QUALITATIVE_QUESTIONS.map((q) => ({
              id: q.id,
              type: "qualitative" as const,
              role: "context" as const,
              variableKey:
                FALLBACK_QUALITATIVE_VARIABLE_KEYS[QUALITATIVE_QUESTIONS.indexOf(q)] ??
                "additional_context",
              question: q.question,
              scoreKey:
                FALLBACK_QUALITATIVE_PILLARS[QUALITATIVE_QUESTIONS.indexOf(q)] ??
                "vision",
              options: [],
            })),
          ]
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !questions?.length) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">
          {loading ? "Loading questions..." : "No questions available."}
        </p>
      </div>
    );
  }

  const question = questions[currentPage];
  const totalPages = questions.length;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalPages - 1;

  const answered =
    question.type === "qualitative" || answers[question.id] != null;

  const handleAnswer = (points: number) => {
    setAnswers((prev) => ({ ...prev, [question.id]: points }));
  };

  const handleNext = () => {
    if (isLastPage) {
      const scoreValues: Record<ScoreKey, number> = {
        vision: 50,
        alignment: 50,
        performance: 50,
        cohesion: 50,
        processes: 50,
        scalability: 50,
      };
      questions
        .filter((q) => q.type === "quantitative" && q.role === "score")
        .forEach((q) => {
          const val = answers[q.id];
          if (val != null && q.scoreKey in scoreValues) {
            scoreValues[q.scoreKey as ScoreKey] = val;
          }
        });
      const summary: AnswerSummary = questions.map((q) => {
        if (q.type === "qualitative") {
          return {
            type: "qualitative",
            question: q.question,
            answer: qualitativeAnswers[q.id]?.trim() || "No qualitative context provided.",
          };
        }
        const points = answers[q.id];
        const opt = q.options.find((o) => o.points === points);
        return { type: "quantitative", question: q.question, answer: opt?.label ?? "-" };
      });
      const qualitativeResponses: QualitativeResponses = {};
      questions
        .filter((q) => q.type === "qualitative")
        .forEach((q) => {
          const answer = qualitativeAnswers[q.id]?.trim();
          if (answer) {
            qualitativeResponses[q.id] = {
              question: q.question,
              answer,
              scoreKey: q.scoreKey,
              variableKey: q.variableKey,
            };
          }
        });
      const diagnosticResponses: DiagnosticResponses = {};
      questions
        .filter(
          (q) =>
            q.type === "quantitative" &&
            (q.role === "context" || q.role === "validation")
        )
        .forEach((q) => {
          const score = answers[q.id];
          const opt = q.options.find((o) => o.points === score);
          if (score != null) {
            diagnosticResponses[q.id] = {
              question: q.question,
              role: q.role as "context" | "validation",
              variableKey: q.variableKey,
              score,
              answer: opt?.label ?? String(score),
            };
          }
        });
      onSubmit(answersToScores(scoreValues), summary, qualitativeResponses, diagnosticResponses);
    } else {
      setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
    }
  };

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress - WhatsApp-style dashes */}
      <div className="mb-10">
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= currentPage ? "bg-[#D97706]" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <fieldset>
          <legend className="mb-6 text-lg font-medium text-gray-800">
            {question.question}
          </legend>
          {question.type === "quantitative" ? (
            <div className="flex flex-col gap-2">
              {question.options.map((opt) => (
                <label
                  key={opt.label}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
                    answers[question.id] === opt.points
                      ? "border-[#D97706] bg-amber-50"
                      : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={opt.points}
                    checked={answers[question.id] === opt.points}
                    onChange={() => handleAnswer(opt.points)}
                    className="h-4 w-4 border-gray-300 text-[#D97706] focus:ring-[#D97706]"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-gray-500">
                Optional: share specific examples or context.
              </p>
              <textarea
                value={qualitativeAnswers[question.id] ?? ""}
                onChange={(e) =>
                  setQualitativeAnswers((prev) => ({
                    ...prev,
                    [question.id]: e.target.value,
                  }))
                }
                placeholder="Type your insights here..."
                rows={6}
                className="w-full resize-none rounded-xl border border-gray-200 p-4 text-sm text-gray-700 outline-none transition-all focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]"
              />
            </div>
          )}
        </fieldset>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstPage}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!answered}
            className="flex items-center gap-2 rounded-lg bg-[#D97706] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLastPage ? "Submit" : "Next"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
