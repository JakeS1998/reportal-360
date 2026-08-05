import React from "react";
import SectionCard from "./SectionCard";
import Skeleton from "./Skeleton";
import { Sparkles } from "lucide-react";

export default function AiExecutiveSummary({ ai, loading }) {
  if (loading) {
    return (
      <SectionCard title="AI Executive Summary" subtitle="Auto-generated narrative for leadership" icon={Sparkles}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </SectionCard>
    );
  }

  if (!ai) {
    return (
      <SectionCard title="AI Executive Summary" subtitle="Auto-generated narrative for leadership" icon={Sparkles}>
        <p className="text-sm text-slate-400">Summary unavailable.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="AI Executive Summary" subtitle="Auto-generated narrative for leadership" icon={Sparkles}>
      <p className="text-sm text-slate-700 leading-relaxed">{ai.summary}</p>
    </SectionCard>
  );
}