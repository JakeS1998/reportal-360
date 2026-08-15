import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fields = [
  ["course_description", "Course description"], ["learning_objectives", "Learning objectives"],
  ["topics_outline", "Topics and outline"], ["assessment_policy", "Assessment policy"],
  ["materials", "Required materials"], ["classroom_expectations", "Classroom expectations"],
  ["contact_information", "Teacher contact information"],
];

export default function SyllabusFields({ syllabus, onChange }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Syllabus title</Label>
        <Input className="mt-1" value={syllabus.title || ""} onChange={(event) => onChange("title", event.target.value)} placeholder="e.g. Grade 5 Science Syllabus" />
      </div>
      {fields.map(([key, label]) => (
        <div key={key}>
          <Label>{label}</Label>
          <Textarea className="mt-1 min-h-24" value={syllabus[key] || ""} onChange={(event) => onChange(key, event.target.value)} />
        </div>
      ))}
    </div>
  );
}