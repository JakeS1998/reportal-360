import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { logAudit } from '../../shared/security.ts';

function londonToday() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = {};
  for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
  return { weekday: parts.weekday, date: `${parts.year}-${parts.month}-${parts.day}` };
}

function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  if (Number.isNaN(hh)) return t;
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = secrets.get("RESEND_API_KEY");
    const fromEmail = secrets.get("RESEND_FROM_EMAIL");
    const { weekday, date } = londonToday();

    const [schedules, teachers] = await Promise.all([
      base44.asServiceRole.entities.ClassSchedule.filter({}, undefined, 500),
      base44.asServiceRole.entities.Teacher.filter({ active: true }, undefined, 500),
    ]);
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const todays = schedules.filter((s) => s.day_of_week === weekday);
    if (todays.length === 0) {
      return Response.json({ success: true, sent: 0, pending: 0, reason: "no_classes_today" });
    }

    const checks = await Promise.all(
      todays.map((s) => base44.asServiceRole.entities.AttendanceRecord.filter({ class_id: s.class_id, date }, undefined, 1))
    );
    const missing = todays.filter((_, i) => checks[i].length === 0);

    const byTeacher = new Map();
    for (const s of missing) {
      const t = teacherMap.get(s.teacher_id);
      if (!t || !t.email) continue;
      if (!byTeacher.has(t.id)) byTeacher.set(t.id, { teacher: t, classes: [] });
      byTeacher.get(t.id).classes.push(s);
    }

    let sent = 0;
    const errors = [];
    for (const { teacher, classes } of byTeacher.values()) {
      const list = classes
        .map((c) => `<li><strong>${c.class_name}</strong> &mdash; ${fmtTime(c.start_time)} to ${fmtTime(c.end_time)}${c.room ? ` (Room ${c.room})` : ""}</li>`)
        .join("");
      const html =
        `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:560px">` +
        `<h2 style="margin:0 0 8px">Attendance reminder</h2>` +
        `<p>Hi ${teacher.full_name || teacher.username},</p>` +
        `<p>The following class(es) scheduled for <strong>${weekday}, ${date}</strong> still need attendance to be taken:</p>` +
        `<ul style="line-height:1.7;padding-left:20px">${list}</ul>` +
        `<p>Please open ReportAL 360, go to <strong>My Classes</strong>, and record attendance for each class. You can save a draft and submit when ready &mdash; and amend later if a student arrives late.</p>` +
        `<p style="color:#64748b;font-size:12px;margin-top:28px;border-top:1px solid #e2e8f0;padding-top:12px">ReportAL 360 by Blueridge Group</p>` +
        `</div>`;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromEmail, to: teacher.email, subject: `Attendance reminder — ${weekday} ${date}`, html }),
        });
        if (!res.ok) {
          const txt = await res.text();
          errors.push({ teacher: teacher.email, error: txt });
        } else {
          sent++;
        }
      } catch (e) {
        errors.push({ teacher: teacher.email, error: e.message });
      }
    }

    await logAudit(
      base44,
      "admin_action",
      "system",
      "admin",
      `Attendance reminders: ${sent} email(s) sent for ${weekday} ${date} (${missing.length} pending class(es), ${byTeacher.size} teacher(s))`,
      undefined,
      { action_type: "attendance_reminder" }
    );

    return Response.json({ success: true, sent, pending: missing.length, teachers: byTeacher.size, errors });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}