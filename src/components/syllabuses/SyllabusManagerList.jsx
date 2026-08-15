import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import SectionCard from "@/components/SectionCard";

export default function SyllabusManagerList({ syllabuses, classes, onSelect }) {
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState("all");
  const classNames = useMemo(() => new Map(classes.map((item) => [item.id, item.class_name])), [classes]);
  const visible = syllabuses.filter((item) => {
    const text = `${item.title} ${item.class_name || classNames.get(item.class_id) || ""} ${item.owner_name || ""}`.toLowerCase();
    return (classId === "all" || item.class_id === classId) && text.includes(query.toLowerCase());
  });
  return <SectionCard title="Submitted Syllabuses" subtitle={`${syllabuses.length} across all classes`}><div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, class, or teacher" /></div><select className="h-9 rounded-md border border-input bg-transparent px-3 text-sm" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="all">All classes</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.class_name}</option>)}</select></div><div className="divide-y divide-slate-100">{visible.length ? visible.map((item) => <button key={item.id} onClick={() => onSelect(item.class_id)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-slate-50"><div><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.class_name || classNames.get(item.class_id) || "Class"} · {item.owner_name || "Teacher"}</p></div><span className="text-xs text-slate-400">Updated {new Date(item.updated_date).toLocaleDateString()}</span></button>) : <p className="py-6 text-center text-sm text-slate-400">No syllabuses match these filters.</p>}</div></SectionCard>;
}