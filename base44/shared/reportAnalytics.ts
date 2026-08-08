export async function buildReportAnalytics(base44, config = {}) {
  const { school_code, class_id, start_date, end_date, attendance_below } = config;
  const [students, classes, attainments, attendance] = await Promise.all([
    base44.asServiceRole.entities.Student.filter({ school_code }, "student_name", 500),
    base44.asServiceRole.entities.Class.filter({ school_code }, "class_name", 500),
    base44.asServiceRole.entities.AttainmentRecord.filter({}, "-date", 500),
    base44.asServiceRole.entities.AttendanceRecord.filter({}, "-date", 500),
  ]);
  const classIds = new Set(classes.filter((item) => !class_id || item.id === class_id).map((item) => item.id));
  const inRange = (item) => (!start_date || !item.date || item.date >= start_date) && (!end_date || !item.date || item.date <= end_date);
  const attainment = attainments.filter((item) => classIds.has(item.class_id) && inRange(item));
  const attendanceRows = attendance.filter((item) => classIds.has(item.class_id) && inRange(item));
  const scores = {};
  const presence = {};
  attainment.forEach((item) => { (scores[item.student_id] ||= []).push({ date: item.date || "", score: (item.score / (item.max_score || 100)) * 100, subject: item.subject || "Unspecified" }); });
  attendanceRows.forEach((item) => { const value = (presence[item.student_id] ||= { present: 0, total: 0 }); value.total += 1; if (item.status === "present") value.present += 1; });
  const rows = students.map((student) => {
    const history = (scores[student.id] || []).sort((a, b) => a.date.localeCompare(b.date));
    const average_score = history.length ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length) : null;
    const midpoint = Math.floor(history.length / 2);
    const early = history.slice(0, midpoint);
    const late = history.slice(midpoint);
    const trend = early.length && late.length ? Math.round((late.reduce((sum, item) => sum + item.score, 0) / late.length) - (early.reduce((sum, item) => sum + item.score, 0) / early.length)) : null;
    const rate = presence[student.id]?.total ? Math.round((presence[student.id].present / presence[student.id].total) * 100) : null;
    const subjectScores = {};
    history.forEach((item) => { (subjectScores[item.subject] ||= []).push(item.score); });
    const subject_averages = Object.fromEntries(Object.entries(subjectScores).map(([subject, values]) => [subject, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)]));
    return { student_id: student.id, student_name: student.student_name, grade_level: student.grade_level || "", average_score, attendance_rate: rate, performance_trend: trend, subject_averages, assessment_count: history.length, attendance_records: presence[student.id]?.total || 0 };
  }).filter((item) => attendance_below == null || (item.attendance_rate != null && item.attendance_rate < attendance_below));
  const scored = rows.filter((item) => item.average_score != null);
  const summary = { student_count: rows.length, average_score: scored.length ? Math.round(scored.reduce((sum, item) => sum + item.average_score, 0) / scored.length) : null, average_attendance: rows.filter((item) => item.attendance_rate != null).length ? Math.round(rows.filter((item) => item.attendance_rate != null).reduce((sum, item) => sum + item.attendance_rate, 0) / rows.filter((item) => item.attendance_rate != null).length) : null };
  return { summary, students: rows, sources: ["Student roster", "Attainment records", "Attendance records", "Class records"] };
}