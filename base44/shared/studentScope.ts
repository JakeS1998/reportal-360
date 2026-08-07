// Shared teacher-scope helper: determines which classes and students a teacher
// may access (their own classes via TeacherClass + their homeroom via Homeroom).
// Used by manageStudents and manageReportCards to enforce consistent scoping.

export async function getTeacherScope(base44, teacherId, schoolCode) {
  const [tcRes, hrRes] = await Promise.all([
    base44.asServiceRole.entities.TeacherClass.filter({ school_code: schoolCode }, undefined, 500),
    base44.asServiceRole.entities.Homeroom.filter({ teacher_id: teacherId }, undefined, 50),
  ]);
  const classIds = new Set(tcRes.filter((t) => t.teacher_id === teacherId).map((t) => t.class_id));
  const homeroomStudentIds = new Set();
  hrRes.forEach((h) => (h.student_ids || []).forEach((sid) => homeroomStudentIds.add(sid)));
  return { classIds, homeroomStudentIds };
}

// Returns { allowedClassIds, isHomeroomTeacher } for a teacher viewing a student.
// allowedClassIds === null means "all the student's classes" (homeroom teacher or non-teacher).
// Throws/returns null if the teacher has no access to the student.
export async function getTeacherStudentAccess(base44, teacherId, schoolCode, studentId) {
  const scope = await getTeacherScope(base44, teacherId, schoolCode);
  const classAssignments = await base44.asServiceRole.entities.StudentClass.filter({ student_id: studentId, status: "active" });
  const studentClassIds = new Set(classAssignments.map((ca) => ca.class_id));
  const shared = [...scope.classIds].filter((id) => studentClassIds.has(id));
  const isHomeroomTeacher = scope.homeroomStudentIds.has(studentId);
  if (shared.length === 0 && !isHomeroomTeacher) {
    return null; // no access
  }
  return {
    allowedClassIds: isHomeroomTeacher ? null : scope.classIds,
    isHomeroomTeacher,
  };
}