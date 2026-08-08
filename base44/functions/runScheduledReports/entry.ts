import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildReportAnalytics } from '../../shared/reportAnalytics.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }).formatToParts(now);
    const part = (type) => Number(local.find((item) => item.type === type)?.value);
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(local.find((item) => item.type === 'weekday')?.value);
    const reports = await base44.asServiceRole.entities.ScheduledReport.filter({ active: true }, undefined, 500);
    let delivered = 0;
    for (const report of reports) {
      const due = part('hour') === report.hour && ((report.frequency === 'weekly' && weekday === report.day_of_week) || (report.frequency === 'monthly' && part('day') === report.day_of_month));
      const alreadySent = report.last_sent_at && new Date(report.last_sent_at).toDateString() === now.toDateString();
      if (!due || alreadySent) continue;
      const data = await buildReportAnalytics(base44, report);
      const body = `<h2>${report.title}</h2><p>Students in scope: ${data.summary.student_count}</p><p>Average attainment: ${data.summary.average_score == null ? 'No data' : `${data.summary.average_score}%`}</p><p>Average attendance: ${data.summary.average_attendance == null ? 'No data' : `${data.summary.average_attendance}%`}</p><p>Data sources: ${data.sources.join(', ')}.</p>`;
      await base44.asServiceRole.integrations.Core.SendEmail({ to: report.recipient_email, subject: report.title, body, from_name: 'ReportAL 360' });
      await base44.asServiceRole.entities.ScheduledReport.update(report.id, { last_sent_at: now.toISOString() });
      delivered += 1;
    }
    return Response.json({ success: true, delivered });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}