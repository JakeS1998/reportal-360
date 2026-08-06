import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Clock, CheckCircle2, XCircle, Award, RotateCcw } from "lucide-react";
import MarkdownPreview from "@/components/MarkdownPreview";

export default function TrainingModuleDetail({ module, completion, onBack, onCompleted, user }) {
  const [tab, setTab] = useState("content");
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const questions = module.questions || [];

  const handleSubmit = async () => {
    const allAnswered = questions.every((_, i) => answers[i] !== undefined);
    if (!allAnswered) return;
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("manageTraining", {
        action: "submit_exam",
        caller_username: user.username,
        module_id: module.id,
        answers,
      });
      if (res.data?.success) {
        setResult(res.data);
        if (res.data.passed) onCompleted();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setResult(null);
  };

  const allAnswered = questions.every((_, i) => answers[i] !== undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{module.title}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{module.category}</span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" /> {module.duration_minutes || 15} min
            </span>
            {completion?.passed && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3 h-3" /> Completed ({completion.score}%)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab("content")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "content" ? "border-[#1D4ED8] text-[#1D4ED8]" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Training Material
        </button>
        <button
          onClick={() => setTab("exam")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "exam" ? "border-[#1D4ED8] text-[#1D4ED8]" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Exam ({questions.length} questions)
        </button>
      </div>

      {tab === "content" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <MarkdownPreview content={module.content} />
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <Button onClick={() => setTab("exam")}>
              Continue to Exam <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {result ? (
            <div className="space-y-6">
              <div className={`text-center py-8 rounded-xl ${result.passed ? "bg-emerald-50" : "bg-rose-50"}`}>
                {result.passed ? (
                  <Award className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                ) : (
                  <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-3" />
                )}
                <h3 className="text-2xl font-bold text-slate-900">
                  {result.passed ? "Congratulations!" : "Not Passed"}
                </h3>
                <p className="text-lg text-slate-600 mt-1">
                  You scored {result.score}% ({result.correct} of {result.total} correct)
                </p>
                <p className="text-sm text-slate-500 mt-2">Passing score: {module.passing_score || 80}%</p>
              </div>

              <div className="space-y-4">
                {questions.map((q, i) => {
                  const userAnswer = answers[i];
                  const isCorrect = userAnswer === q.correct_answer;
                  return (
                    <div key={i} className={`p-4 rounded-lg border ${isCorrect ? "border-emerald-200 bg-emerald-50/50" : "border-rose-200 bg-rose-50/50"}`}>
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{q.question}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            Your answer: {q.options?.[userAnswer] || "Not answered"}
                          </p>
                          {!isCorrect && (
                            <p className="text-xs text-emerald-700 mt-0.5">
                              Correct answer: {q.options?.[q.correct_answer]}
                            </p>
                          )}
                          {q.explanation && (
                            <p className="text-xs text-slate-500 mt-1.5 italic">{q.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>Back to Modules</Button>
                {!result.passed && (
                  <Button onClick={handleRetry}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Retry Exam
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-slate-600">
                Answer all {questions.length} questions below. You need {module.passing_score || 80}% to pass.
              </p>
              {questions.map((q, i) => (
                <div key={i} className="space-y-3">
                  <p className="text-sm font-medium text-slate-900">{i + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options?.map((opt, j) => (
                      <label
                        key={j}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          answers[i] === j ? "border-[#1D4ED8] bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q${i}`}
                          checked={answers[i] === j}
                          onChange={() => setAnswers({ ...answers, [i]: j })}
                          className="accent-[#1D4ED8]"
                        />
                        <span className="text-sm text-slate-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {Object.keys(answers).length} of {questions.length} answered
                </p>
                <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
                  {submitting ? "Submitting..." : "Submit Exam"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}