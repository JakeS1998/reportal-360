import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit } from '../../shared/security.ts';

const EXPORT_COUNT_THRESHOLD = 50;
const EXPORT_RECORD_THRESHOLD = 5000;
const PER_USER_THRESHOLD = 10;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const logs = await base44.asServiceRole.entities.AuditLog.filter(
      { event_type: "data_export" },
      "-created_date",
      500
    );

    const recentExports = logs.filter(
      (l) => l.created_date && new Date(l.created_date) > yesterday
    );

    const totalExports = recentExports.length;
    const totalRecords = recentExports.reduce(
      (sum, l) => sum + (l.export_record_count || 0), 0
    );

    const alerts = [];

    if (totalExports > EXPORT_COUNT_THRESHOLD) {
      alerts.push({
        type: "export_count_threshold",
        message: `${totalExports} exports in 24h (threshold: ${EXPORT_COUNT_THRESHOLD})`,
        severity: "high",
      });
    }

    if (totalRecords > EXPORT_RECORD_THRESHOLD) {
      alerts.push({
        type: "export_record_threshold",
        message: `${totalRecords} records exported in 24h (threshold: ${EXPORT_RECORD_THRESHOLD})`,
        severity: "high",
      });
    }

    // Per-user spike detection
    const userExports: Record<string, number> = {};
    recentExports.forEach((l) => {
      const u = l.username || "unknown";
      userExports[u] = (userExports[u] || 0) + 1;
    });

    Object.entries(userExports).forEach(([username, count]) => {
      if (count > PER_USER_THRESHOLD) {
        alerts.push({
          type: "user_export_spike",
          message: `User "${username}" made ${count} exports in 24h (threshold: ${PER_USER_THRESHOLD})`,
          severity: "medium",
        });
      }
    });

    // Log each alert as an audit event
    for (const alert of alerts) {
      await logAudit(base44, "admin_action", "system", "admin", `EXPORT ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`, undefined, {
        action_type: alert.type,
        success: false,
      });
    }

    return Response.json({
      success: true,
      alerts,
      totalExports,
      totalRecords,
      thresholds: { count: EXPORT_COUNT_THRESHOLD, records: EXPORT_RECORD_THRESHOLD, perUser: PER_USER_THRESHOLD },
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}