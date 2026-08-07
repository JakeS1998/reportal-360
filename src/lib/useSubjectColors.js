import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { subjectColor } from "@/lib/scheduleWeeks";

// Module-level cache so every schedule view shares a single Subject fetch.
let subjectColorPromise = null;

function loadSubjectColors() {
  if (!subjectColorPromise) {
    subjectColorPromise = base44.entities.Subject.list("name", 200)
      .then((list) => {
        const map = {};
        for (const s of list) {
          if (s.name) map[s.name.trim().toLowerCase()] = s.color || subjectColor(s.name);
        }
        return map;
      })
      .catch((err) => {
        console.error("Failed to load subject colors", err);
        subjectColorPromise = null; // allow a retry on the next mount
        return {};
      });
  }
  return subjectColorPromise;
}

// Resolves a class subject name to the colour configured on the Subjects &
// Rooms page, falling back to the deterministic hash palette when no Subject
// record exists (or has no colour set).
export function useSubjectColors() {
  const [subjectMap, setSubjectMap] = useState({});

  useEffect(() => {
    let active = true;
    loadSubjectColors().then((map) => { if (active) setSubjectMap(map); });
    return () => { active = false; };
  }, []);

  const resolveSubjectColor = useCallback((subjectName) => {
    if (!subjectName) return "#64748b";
    const key = String(subjectName).trim().toLowerCase();
    return subjectMap[key] || subjectColor(subjectName);
  }, [subjectMap]);

  return { resolveSubjectColor, subjectMap };
}