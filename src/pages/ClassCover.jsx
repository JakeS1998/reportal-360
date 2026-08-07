import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Link } from "react-router-dom";
import SectionCard from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Repeat, CalendarDays, UserCheck, AlertTriangle, Plus } from "lucide-react";

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function ClassCover() {
  const { user, canManageStaff } = useSchool();
  const [schedules, setSchedules] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [colleagues, setColleagues] = useState([]);
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ class_id: "", cover_date: "", cover_teacher_id: "", notes: "" });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const callerPassword = user.password || localStorage.getItem("userPassword") || "";
      const [schedRes, coversRes] = await Promise.all([
        base44.entities.ClassSchedule.filter({ teacher_id: user.id }, "day_of_week", 500).catch(() => []),
        base44.functions.invoke("manageClassCovers", {
          action: "list",
          caller_username: user.username,
          caller_password: callerPassword,
        }).catch(() => ({ data: { covers: [] } })),
      ]);
      setSchedules(schedRes);
      setCovers(coversRes.data?.covers || []);
      if (user.school_code) {
        try {
          const colRes = await base44.functions.invoke("manageClassCovers", {
            action: "list_colleagues",
            caller_username: user.username,
            caller_password: callerPassword,
            school_code: user.school_code,
          });
          setColleagues(colRes.data?.colleagues || []);
        } catch (e) {
          setColleagues([]);
        }
        if (canManageStaff) {
          const clsRes = await base44.entities.Class.filter({ school_code: user.school_code }, "class_name", 500).catch(() => []);
          setSchoolClasses(clsRes);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, canManageStaff]);

  useEffect(() => { load(); }, [load]);

  const classOptions = (() => {
    const map = new Map();
    for (const s of schedules) {
      if (!map.has(s.class_id)) {
        map.set(s.class_id, { class_id: s.class_id, label: `${s.class_name} — ${s.day_of_week} ${fmtTime(s.start_time)}` });
      }
    }
    for (const c of schoolClasses) {
      if (!map.has(c.id)) {
        map.set(c.id, { class_id: c.id, label: `${c.class_name}${c.subject ? ` (${c.subject})` : ""}` });
      }
    }
    return [...map.values()];
  })();

  const today = todayStr();
  const arranged = covers.filter((c) => c.original_teacher_id === user?.id && c.status === "active" && c.cover_date >= today);
  const covering = covers.filter((c) => c.cover_teacher_id === user?.id && c.status === "active" && c.cover_date >= today);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.class_id || !form.cover_date || !form.cover_teacher_id) {
      setError("Select a class, date, and cover teacher.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await base44.functions.invoke("manageClassCovers", {
        action: "create",
        caller_username: user.username,
        caller_password: user.password || localStorage.getItem("userPassword") || "",
        class_id: form.class_id,
        cover_date: form.cover_date,
        cover_teacher_id: form.cover_teacher_id,
        notes: form.notes,
      });
      if (!res.data?.success) throw new Error(res.data?.error || "Failed to arrange cover");
      setShowForm(false);
      setForm({ class_id: "", cover_date: "", cover_teacher_id: "", notes: "" });
      load();
    } catch (err) {
      setError(err.message || "Failed to arrange cover");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (coverId) => {
    if (!confirm("Cancel this cover arrangement?")) return;
    try {
      await base44.functions.invoke("manageClassCovers", {
        action: "cancel",
        caller_username: user.username,
        caller_password: user.password || localStorage.getItem("userPassword") || "",
        cover_id: coverId,
      });
      load();
    } catch (err) {
      alert(err.message || "Failed to cancel cover");
    }
  };

  if (loading) return <div className="animate-pulse rounded-xl bg-slate-100 h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Repeat className="w-5 h-5 text-slate-500" /> Class Cover</h2>
          <p className="text-sm text-slate-500">Arrange a colleague to cover one of your classes, or view classes you're covering.</p>
        </div>
        <Button onClick={() => { setError(""); setShowForm(true); }} className="bg-slate-900 hover:bg-slate-800"><Plus className="w-4 h-4 mr-1" /> Arrange Cover</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={`Covers I've Arranged (${arranged.length})`} subtitle="Classes where someone is covering for you" icon={CalendarDays}>
          {arranged.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No upcoming covers arranged.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {arranged.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.class_name}</p>
                    <p className="text-xs text-slate-500">{c.cover_date} · {fmtTime(c.start_time)}–{fmtTime(c.end_time)} {c.room ? `· ${c.room}` : ""}</p>
                    <p className="text-xs text-slate-400">Covered by {c.cover_teacher_name}{c.notes ? ` · ${c.notes}` : ""}</p>
                  </div>
                  <button onClick={() => handleCancel(c.id)} className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50">Cancel</button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={`Classes I'm Covering (${covering.length})`} subtitle="Classes where you're the cover teacher" icon={UserCheck}>
          {covering.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No upcoming covers assigned to you.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {covering.map((c) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.class_name}</p>
                    <p className="text-xs text-slate-500">{c.cover_date} · {fmtTime(c.start_time)}–{fmtTime(c.end_time)} {c.room ? `· ${c.room}` : ""}</p>
                    <p className="text-xs text-slate-400">For {c.original_teacher_name}</p>
                  </div>
                  <Link to={`/classes/${c.class_id}`} className="text-xs text-[#9E1B32] hover:underline px-2 py-1">Open</Link>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Arrange a Class Cover</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Class to cover</Label>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select a class…</option>
                {classOptions.map((o) => <option key={o.class_id} value={o.class_id}>{o.label}</option>)}
              </select>
              {classOptions.length === 0 && <p className="text-xs text-slate-400 mt-1">No classes available to cover.</p>}
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Cover date</Label>
              <Input type="date" value={form.cover_date} onChange={(e) => setForm({ ...form, cover_date: e.target.value })} className="mt-1" required />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Cover teacher</Label>
              <select value={form.cover_teacher_id} onChange={(e) => setForm({ ...form, cover_teacher_id: e.target.value })} className="mt-1 w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <option value="">Select a colleague…</option>
                {colleagues.map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.subject ? ` · ${t.subject}` : ""}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. lesson plan in desk drawer" className="mt-1" />
            </div>
            {error && <p className="text-sm text-rose-600 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">{saving ? "Arranging…" : "Arrange Cover"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}