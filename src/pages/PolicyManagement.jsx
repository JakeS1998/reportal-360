import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { LogOut, Save, FileText, Eye, Pencil } from "lucide-react";
import MarkdownPreview from "@/components/MarkdownPreview";

export default function PolicyManagement() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [tab, setTab] = useState("edit");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("userSession") || "null");
    if (!s || s.user?.role !== "admin") {
      navigate("/admin-login");
      return;
    }
    setSession(s);
    loadPolicies();
  }, [navigate]);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "list_policies",
        caller_username: "BRGAdmin",
        caller_password: "BRGAdmin",
      });
      if (res.data?.success) {
        const sorted = (res.data.policies || []).sort((a, b) =>
          (a.title || "").localeCompare(b.title || "")
        );
        setPolicies(sorted);
        if (sorted.length > 0) selectPolicy(sorted[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const selectPolicy = (p) => {
    setSelectedId(p.id);
    setEditContent(p.content || "");
    setEditTitle(p.title || "");
    setDirty(false);
    setTab("edit");
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await base44.functions.invoke("manageSchoolStaff", {
        action: "update_policy",
        caller_username: "BRGAdmin",
        caller_password: "BRGAdmin",
        policy_id: selectedId,
        content: editContent,
        title: editTitle,
      });
      if (res.data?.success) {
        setDirty(false);
        setPolicies((prev) =>
          prev.map((p) =>
            p.id === selectedId
              ? {
                  ...p,
                  title: editTitle,
                  version: res.data.policy.version,
                  last_updated_by: res.data.policy.last_updated_by,
                  updated_date: new Date().toISOString(),
                }
              : p
          )
        );
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!session) return null;

  const selectedPolicy = policies.find((p) => p.id === selectedId);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Policy Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Edit institutional compliance policies</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/ferpa")}>Back to FERPA</Button>
          <Button variant="ghost" onClick={() => { localStorage.removeItem("userSession"); navigate("/admin-login"); }}>
            <LogOut className="w-4 h-4 mr-1" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Policy List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 px-2">Policies</h2>
            <div className="space-y-1">
              {policies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPolicy(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedId === p.id ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <span className="text-sm font-medium leading-tight">{p.title}</span>
                  </div>
                  <div className={`text-[10px] mt-1 px-2 ${selectedId === p.id ? "text-slate-400" : "text-slate-400"}`}>
                    v{p.version || 1} · {p.category || "General"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            {selectedPolicy ? (
              <>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      value={editTitle}
                      onChange={(e) => { setEditTitle(e.target.value); setDirty(true); }}
                      className="text-base font-semibold text-slate-900 bg-transparent border-none outline-none flex-1 min-w-0"
                    />
                    {dirty && <span className="text-xs text-amber-500 font-medium shrink-0">Unsaved changes</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex rounded-lg border border-slate-200 p-0.5">
                      <button
                        onClick={() => setTab("edit")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 ${
                          tab === "edit" ? "bg-slate-900 text-white" : "text-slate-500"
                        }`}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => setTab("preview")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 ${
                          tab === "preview" ? "bg-slate-900 text-white" : "text-slate-500"
                        }`}
                      >
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                    <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
                      <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>

                {tab === "edit" ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
                    className="flex-1 min-h-[500px] px-6 py-4 text-sm font-mono text-slate-700 bg-slate-50/50 border-none outline-none resize-none rounded-b-2xl"
                    placeholder="Write policy content in Markdown..."
                  />
                ) : (
                  <div className="flex-1 min-h-[500px] px-6 py-4 overflow-y-auto">
                    <MarkdownPreview content={editContent} />
                  </div>
                )}

                <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Version {selectedPolicy.version || 1}</span>
                  {selectedPolicy.last_updated_by && (
                    <span>Last updated by {selectedPolicy.last_updated_by}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 py-20">
                {loading ? "Loading policies..." : "Select a policy to edit"}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}