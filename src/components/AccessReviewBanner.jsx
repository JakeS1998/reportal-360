import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, ArrowRight, X } from "lucide-react";

export default function AccessReviewBanner({ user, school }) {
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "manager" || !school?.school_code) return;
    base44.functions
      .invoke("manageAccessReviews", {
        action: "get_active",
        caller_username: user.username,
        caller_password: user.password,
        school_code: school.school_code,
      })
      .then((res) => {
        if (res.data?.success && res.data.reviews?.length > 0) {
          setReview(res.data.reviews[0]);
        }
      })
      .catch(() => {});
  }, [user, school]);

  if (!review || dismissed) return null;

  const started = review.started_date ? new Date(review.started_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (started && started > today) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-amber-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">Annual Access Review due for {school.school_name}</p>
          <p className="text-xs text-amber-700 mt-0.5">Each September, managers must review staff access at their school. Open the review to confirm your roster and complete it.</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate("/access-review")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg transition-colors"
        >
          Start Review <ArrowRight className="w-4 h-4" />
        </button>
        <button onClick={() => setDismissed(true)} className="text-amber-600 hover:text-amber-800 p-1" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}