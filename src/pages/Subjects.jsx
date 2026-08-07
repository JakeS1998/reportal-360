import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionCard from "@/components/SectionCard";
import FadeIn from "@/components/FadeIn";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, Plus, Trash2, Pencil, LogOut, DoorOpen, X, Save,
} from "lucide-react";

const COLORS = ["#1D4ED8", "#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6"];

export default function Subjects() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", color: COLORS[0], rooms: [] });
  const [newRoom, setNewRoom] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!s || s.user?.role !== "admin") {
      navigate("/admin-login");
      return;
    }
    setSession(s);
    loadSubjects();
  }, [navigate]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Subject.list("name", 200);
      setSubjects(list);
    } catch (err) {
      setError(err.message || "Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", color: COLORS[0], rooms: [] });
    setNewRoom("");
    setShowDialog(true);
  };

  const openEdit = (subj) => {
    setEditing(subj);
    setForm({ name: subj.name || "", color: subj.color || COLORS[0], rooms: subj.rooms || [] });
    setNewRoom("");
    setShowDialog(true);
  };

  const addRoom = () => {
    const r = newRoom.trim();
    if (!r) return;
    if (form.rooms.includes(r)) return;
    setForm({ ...form, rooms: [...form.rooms, r] });
    setNewRoom("");
  };

  const removeRoom = (r) => setForm({ ...form, rooms: form.rooms.filter((x) => x !== r) });

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const payload = { name: form.name.trim(), color: form.color, rooms: form.rooms };
      if (editing) {
        await base44.entities.Subject.update(editing.id, payload);
      } else {
        await base44.entities.Subject.create(payload);
      }
      setShowDialog(false);
      loadSubjects();
    } catch (err) {
      setError(err.message || "Failed to save subject");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subj) => {
    if (!confirm(`Delete subject "${subj.name}"? This cannot be undone.`)) return;
    try {
      await base44.entities.Subject.delete(subj.id);
      loadSubjects();
    } catch (err) {
      alert(err.message || "Failed to delete subject");
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Administration · Subjects & Rooms</h1>
          <p className="text-xs text-slate-500 mt-0.5">Define the subjects taught and the rooms available for each</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/admin")}>Back to Admin</Button>
          <Button variant="ghost" onClick={() => { localStorage.removeItem("userSession"); navigate("/admin-login"); }}>
            <LogOut className="w-4 h-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <FadeIn>
          <SectionCard title="Subjects" subtitle="Manage subjects and their rooms" icon={BookOpen}
            action={
              <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-1" /> Add Subject
              </Button>
            }
          >
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-xl bg-slate-100 h-20" />)}
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">No subjects yet. Add your first subject to get started.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((s) => (
                  <div key={s.id} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color || "#1D4ED8" }} />
                        <h3 className="text-sm font-semibold text-slate-800">{s.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-1.5">Rooms</p>
                      {(s.rooms || []).length === 0 ? (
                        <p className="text-xs text-slate-400">No rooms assigned</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {s.rooms.map((r) => (
                            <span key={r} className="text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-md px-2 py-1 flex items-center gap-1">
                              <DoorOpen className="w-3 h-3 text-slate-400" /> {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </FadeIn>
      </main>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) setShowDialog(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Subject" : "Add Subject"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-slate-700">Subject Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" className="mt-1" required />
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Color</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {COLORS.map((c) => (
                  <button type="button" key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition ${form.color === c ? "border-slate-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Rooms</Label>
              <div className="flex gap-2 mt-1">
                <Input value={newRoom} onChange={(e) => setNewRoom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRoom(); } }}
                  placeholder="e.g. 204" className="flex-1" />
                <Button type="button" variant="outline" onClick={addRoom}><Plus className="w-4 h-4" /></Button>
              </div>
              {form.rooms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {form.rooms.map((r) => (
                    <span key={r} className="text-xs font-medium bg-slate-100 text-slate-600 rounded-md px-2 py-1 flex items-center gap-1">
                      <DoorOpen className="w-3 h-3 text-slate-400" /> {r}
                      <button type="button" onClick={() => removeRoom(r)} className="text-slate-400 hover:text-rose-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}