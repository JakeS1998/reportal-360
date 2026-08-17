import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AthleteMonitoringFilters({ search, team, status, teams, onSearchChange, onTeamChange, onStatusChange, onClear }) {
  const hasFilters = search || team || status;
  return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
    <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search athletes" className="w-full sm:w-56" />
    <select value={team} onChange={(event) => onTeamChange(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm text-slate-700">
      <option value="">All teams</option>
      {teams.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
    </select>
    <select value={status} onChange={(event) => onStatusChange(event.target.value)} className="h-9 rounded-md border border-input bg-white px-3 text-sm text-slate-700">
      <option value="">All eligibility</option>
      <option value="on-track">On track</option>
      <option value="review">Review needed</option>
    </select>
    {hasFilters && <Button variant="ghost" size="sm" onClick={onClear}>Clear filters</Button>}
  </div>;
}