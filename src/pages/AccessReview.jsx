import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import { ClipboardCheck, CheckCircle2, AlertCircle, Users, Lock } from "lucide-react";

export default function AccessReview() {
  const { user, school, isManager, canManageStaff } = useSchool();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user || !school?.school_code) return;
    if (!isManager && !canManageStaff) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, school]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [revRes, staffRes] = await Promise.all([
        base44.functions.invoke("manageAccessReviews", {
          action: "get_active",
          caller_username: user.username,
          caller_password: user.password,
          school_code: school.school_code,
        }),
        base44.functions.invoke("manageSchoolStaff", {
          action: "list",
          caller_username: user.username,
          caller_password: user.password,
        }),
      ]);
      if (revRes.data?.success && revRes.data.reviews?.length > 0) {
        setReview(revRes.data.reviews[0]);
      }
      if (staffRes.data?.success) {
        setStaff(staffRes.data.users || []);
      }
    } catch {
      setError("Unable to load access review");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageAccessReviews", {
        action: "complete",
        caller_username: user.username,
        caller_password: user.password,
        review_id: review.id,
        notes,
      });
      if (!res.data?.success) {
        setError(res.data?.error || "Unable to complete review");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Unable to complete review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isManager && !canManageStaff) {
    return <div className="text-center py-20 text-slate-500">You don't have access to the annual access review.</div>;
  }

  if (done) {
    return (
      <FadeIn>
        <SectionCard title="Access Review Complete" icon={CheckCircle2}>
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Thank you — review submitted</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              The annual access review for {school.school_name} ({review?.year}) has been recorded. You'll be prompted again next September.
            </p>
            <Button className="mt-6" onClick={() => navigate("/overview")}>Back to Overview</Button>
          </div>
        </SectionCard>
      </FadeIn>
    );
  }

  if (!review) {
    return (
      <FadeIn>
        <SectionCard title="Annual Access Review" icon={ClipboardCheck}>
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">No active access review</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              The annual access review for {school.school_name} opens on September 1st. You'll see a prompt here and on your overview when it's due.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => navigate("/overview")}>Back to Overview</Button>
          </div>
        </SectionCard>
      </FadeIn>
    );
  }

  const started = review.started_date ? new Date(review.started_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const notYetOpen = !!(started && started > today);

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-amber-900">Annual Access Review — {review.year}</h1>
              <p className="text-xs text-amber-700 mt-0.5">{school.school_name} · Opened {review.started_date}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      {notYetOpen ? (
        <SectionCard title="Review not yet open" icon={AlertCircle}>
          <p className="text-sm text-slate-600">This review opens on {review.started_date}. Please return on or after September 1st to complete it.</p>
        </SectionCard>
      ) : (
        <>
          <FadeIn delay={40}>
            <SectionCard
              title="Staff Access Roster"
              subtitle={`Review the ${staff.length} account(s) with access to ${school.school_name}. Confirm each is still appropriate, then complete the review.`}
              icon={Users}
            >
              {staff.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">No staff accounts found for your school.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                        <th className="pb-2 pr-4 font-medium">Name</th>
                        <th className="pb-2 pr-4 font-medium">Username</th>
                        <th className="pb-2 pr-4 font-medium">Role</th>
                        <th className="pb-2 pr-4 font-medium">Email</th>
                        <th className="pb-2 pr-4 font-medium">Status</th>
                        <th className="pb-2 font-medium">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((s) => (
                        <tr key={s.id} className="border-b border-slate-50">
                          <td className="py-2.5 pr-4 text-slate-700 font-medium">{s.full_name || "—"}</td>
                          <td className="py-2.5 pr-4 text-slate-600 font-mono text-xs">{s.username}</td>
                          <td className="py-2.5 pr-4">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{s.role}</span>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-600 text-xs">{s.email || "—"}</td>
                          <td className="py-2.5 pr-4">
                            {s.active === false ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">Inactive</span>
                            ) : (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Active</span>
                            )}
                          </td>
                          <td className="py-2.5 text-xs text-slate-500">
                            {s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : "Never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </FadeIn>

          <FadeIn delay={80}>
            <SectionCard
              title="Complete Review"
              subtitle="Add any notes about changes made (e.g. accounts deactivated, roles updated), then submit to close this year's review."
              icon={ClipboardCheck}
            >
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes about changes made during this review..." rows={4} className="mb-4" />
              {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
              <div className="flex items-center gap-3">
                <Button onClick={handleComplete} disabled={submitting} className="bg-amber-600 hover:bg-amber-700">
                  {submitting ? "Submitting..." : "Confirm & Complete Review"}
                </Button>
                <Button variant="outline" onClick={() => navigate("/overview")}>Cancel</Button>
              </div>
            </SectionCard>
          </FadeIn>
        </>
      )}
    </div>
  );
}