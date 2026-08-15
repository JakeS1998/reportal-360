import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import { Button } from "@/components/ui/button";
import SectionCard from "@/components/SectionCard";
import SyllabusFields from "@/components/syllabuses/SyllabusFields";
import SyllabusManagerList from "@/components/syllabuses/SyllabusManagerList";

const blankSyllabus = { title: "", course_description: "", learning_objectives: "", topics_outline: "", assessment_policy: "", materials: "", classroom_expectations: "", contact_information: "" };

export default function Syllabuses() {
  const { user, school, canManageStaff } = useSchool();
  const [classes, setClasses] = useState([]); const [syllabuses, setSyllabuses] = useState([]); const [selectedClassId, setSelectedClassId] = useState(""); const [syllabus, setSyllabus] = useState(blankSyllabus); const [saving, setSaving] = useState(false);
  const credentials = { caller_username: user?.username, caller_password: user?.password || localStorage.getItem("userPassword") || "", caller_email: user?.email || "", caller_sso: Boolean(user?.sso || user?.email) };
  const load = useCallback(async () => { if (!school?.school_code) return; const response = await base44.functions.invoke("manageSyllabuses", { action: "list", school_code: school.school_code, ...credentials }); setClasses(response.data?.classes || []); setSyllabuses(response.data?.syllabuses || []); }, [school?.school_code, user?.username, user?.password, user?.email, user?.sso]);
  useEffect(() => { load(); }, [load]);
  const selectClass = (classId) => { setSelectedClassId(classId); const existing = syllabuses.find((item) => item.class_id === classId); const className = classes.find((item) => item.id === classId)?.class_name || ""; setSyllabus(existing || { ...blankSyllabus, title: `${className} Syllabus` }); };
  const save = async () => { if (!selectedClassId || !syllabus.title.trim()) return; setSaving(true); const selectedClass = classes.find((item) => item.id === selectedClassId); await base44.functions.invoke("manageSyllabuses", { action: "save", school_code: school.school_code, syllabus: { ...syllabus, class_id: selectedClassId, class_name: selectedClass?.class_name || "" }, ...credentials }); await load(); setSaving(false); };
  return <div className="space-y-6">{canManageStaff && <SyllabusManagerList syllabuses={syllabuses} classes={classes} onSelect={selectClass} />}<div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"><SectionCard title={canManageStaff ? "Classes" : "My Classes"}><div className="space-y-2">{classes.length ? classes.map((item) => <button key={item.id} onClick={() => selectClass(item.id)} className={`w-full rounded-lg border p-3 text-left text-sm ${selectedClassId === item.id ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}><p className="font-semibold">{item.class_name}</p><p className="mt-0.5 text-xs text-slate-500">{syllabuses.some((current) => current.class_id === item.id) ? "Syllabus saved" : "No syllabus yet"}</p></button>) : <p className="text-sm text-slate-400">No assigned classes found.</p>}</div></SectionCard><SectionCard title={selectedClassId ? "Edit Syllabus" : "Choose a class"}>{selectedClassId ? <><SyllabusFields syllabus={syllabus} onChange={(key, value) => setSyllabus({ ...syllabus, [key]: value })} /><div className="mt-5 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Syllabus"}</Button></div></> : <p className="text-sm text-slate-400">Select one of your classes to create or edit its syllabus.</p>}</SectionCard></div></div>;
}