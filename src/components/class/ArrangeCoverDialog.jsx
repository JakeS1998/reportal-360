import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";

export default function ArrangeCoverDialog({ open, onOpenChange, classId, className, coverDate, dayLabel, onSuccess }) {
  const { user } = useSchool();
  const [colleagues, setColleagues] = useState([]);
  const [loadingColleagues, setLoadingColleagues] = useState(false);
  const [coverTeacherId, setCoverTeacherId] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(coverDate || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCoverTeacherId("");
    setNotes("");
    setDate(coverDate || "");
    setError("");
    if (!user?.school_code) return;
    setLoadingColleagues(true);
    base44.functions.invoke("manageClassCovers", {
      action: "list_colleagues",
      caller_username: user.username,
      caller_password: user.password || localStorage.getItem("userPassword") || "",
      caller_email: user.email || "",
      caller_sso: Boolean(user.sso || user.email),
      school_code: user.school_code,
    })
      .then((res) => {
        if (!res.data?.success) {
          setColleagues([]);
          setError(res.data?.error || "Unable to load colleagues.");
          return;
        }
        setColleagues(res.data.colleagues || []);
      })
      .catch((err) => {
        setColleagues([]);
        setError(err.response?.data?.error || err.message || "Unable to load colleagues.");
      })
      .finally(() => setLoadingColleagues(false));
  }, [open, coverDate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!classId || !date || !coverTeacherId) {
      setError("Select a cover teacher and date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageClassCovers", {
        action: "create",
        caller_username: user.username,
        caller_password: user.password || localStorage.getItem("userPassword") || "",
        caller_email: user.email || "",
        caller_sso: Boolean(user.sso || user.email),
        class_id: classId,
        cover_date: date,
        cover_teacher_id: coverTeacherId,
        notes,
      });
      if (!res.data?.success) throw new Error(res.data?.error || "Failed to arrange cover");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Failed to arrange cover");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Arrange Cover</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-slate-700">Class to cover</Label>
            <div className="mt-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800">
              {className}{dayLabel ? <span className="text-slate-400"> · {dayLabel}</span> : null}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Cover date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Cover teacher</Label>
            <select value={coverTeacherId} onChange={(e) => setCoverTeacherId(e.target.value)} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" required>
              <option value="">{loadingColleagues ? "Loading…" : "Select a colleague…"}</option>
              {colleagues.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` · ${t.subject}` : ""}</option>
              ))}
            </select>
            {!loadingColleagues && colleagues.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">No colleagues available at your school.</p>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium text-slate-700">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. lesson plan in desk drawer" className="mt-1" />
          </div>
          {error && <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? "Arranging…" : "Arrange Cover"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}