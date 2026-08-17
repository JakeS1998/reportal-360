import React, { useEffect, useState } from "react";
import { Trophy, UsersRound, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useSchool } from "@/lib/SchoolContext";
import AthleticsTeamForm from "@/components/athletics/AthleticsTeamForm";
import AthleticsEventForm from "@/components/athletics/AthleticsEventForm";
import AthleticsRosterManager from "@/components/athletics/AthleticsRosterManager";
import AthleticsAbsenceList from "@/components/athletics/AthleticsAbsenceList";

export default function Athletics() {
  const { school, user, canAccessAthletics, canManageAthletics } = useSchool();
  const schoolCode = school?.school_code || user?.school_code;
  const [data, setData] = useState({ teams: [], members: [], events: [], students: [] });
  const [loading, setLoading] = useState(true);
  const ownsTeam = (team) => team.coach_id === user?.id || team.coach_id === user?.teacher_id;
  const load = async () => { if (!schoolCode) return; setLoading(true); const [teams, members, events, students] = await Promise.all([base44.entities.AthleticsTeam.filter({ school_code: schoolCode }), base44.entities.AthleticsTeamMember.filter({ school_code: schoolCode }), base44.entities.AthleticsEvent.filter({ school_code: schoolCode }), base44.entities.Student.filter({ school_code: schoolCode })]); setData({ teams, members, events, students }); setLoading(false); };
  useEffect(() => { if (canAccessAthletics) load(); }, [schoolCode, canAccessAthletics]);
  if (!canAccessAthletics) return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Athletics is available to assigned coaches and managers.</div>;
  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  const teams = canManageAthletics ? data.teams : data.teams.filter(ownsTeam);
  const teamIds = new Set(teams.map((team) => team.id));
  const members = data.members.filter((member) => teamIds.has(member.team_id));
  const events = data.events.filter((event) => teamIds.has(event.team_id));
  return <div className="space-y-7"><div><div className="flex items-center gap-2"><Trophy className="h-6 w-6 text-rose-700" /><h1 className="text-2xl font-bold text-slate-900">Athletics</h1></div><p className="mt-1 text-sm text-slate-500">{canManageAthletics ? "Manage every school team, roster, and athletics event." : "Manage your teams, rosters, and athletics events."}</p></div><section className="space-y-3"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-slate-500" /><h2 className="font-semibold text-slate-900">Teams and rosters</h2></div><AthleticsTeamForm schoolCode={schoolCode} user={user} onCreated={(team) => setData((current) => ({ ...current, teams: [...current.teams, team] }))} /><div className="grid gap-4 lg:grid-cols-2">{teams.map((team) => <AthleticsRosterManager key={team.id} team={team} students={data.students} members={members} schoolCode={schoolCode} onAdded={(newMembers) => setData((current) => ({ ...current, members: [...current.members, ...(Array.isArray(newMembers) ? newMembers : [newMembers])] }))} onRemoved={(memberId) => setData((current) => ({ ...current, members: current.members.filter((member) => member.id !== memberId) }))} />)}</div>{!teams.length && <p className="text-sm text-slate-500">{canManageAthletics ? "Create a team to begin adding athletes." : "You have not been assigned to coach a team yet."}</p>}</section><section className="space-y-3"><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-slate-500" /><h2 className="font-semibold text-slate-900">Athletics schedule</h2></div><AthleticsEventForm schoolCode={schoolCode} teams={teams} onCreated={(event) => setData((current) => ({ ...current, events: [...current.events, event] }))} /></section><section className="space-y-3"><h2 className="font-semibold text-slate-900">Upcoming student absences</h2><p className="text-sm text-slate-500">Use this view to plan classroom work around athletics commitments.</p><AthleticsAbsenceList events={events} members={members} /></section></div>;
}