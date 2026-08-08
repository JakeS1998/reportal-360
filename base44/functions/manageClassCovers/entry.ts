import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials, logAudit } from '../../shared/security.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

function dayOfWeek(dateStr) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
}

export default async function(req) {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, ...params } = body;
    const base44 = createClientFromRequest(req);

    // --- Authenticate caller ---
    let callerRole = null;
    let callerSystemCode = null;
    let callerSchoolCode = null;
    let callerId = null;
    let callerName = "";

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
      callerName = "admin";
    } else if (caller_sso && caller_email) {
      const callers = await base44.asServiceRole.entities.Teacher.filter({ email: caller_email }, undefined, 1);
      if (callers.length === 0) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      if (callers[0].active === false) {
        return Response.json({ success: false, error: "Account inactive" }, { status: 403 });
      }
      callerRole = callers[0].role;
      callerSystemCode = callers[0].system_code;
      callerSchoolCode = callers[0].school_code;
      callerId = callers[0].id;
      callerName = callers[0].username;
    } else if (caller_username) {
      const callers = await base44.asServiceRole.entities.Teacher.filter({
        username: caller_username,
        password: caller_password,
      });
      if (callers.length === 0) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      if (callers[0].active === false) {
        return Response.json({ success: false, error: "Account inactive" }, { status: 403 });
      }
      callerRole = callers[0].role;
      callerSystemCode = callers[0].system_code;
      callerSchoolCode = callers[0].school_code;
      callerId = callers[0].id;
      callerName = callers[0].username;
    } else {
      return Response.json({ success: false, error: "Caller credentials required" }, { status: 403 });
    }

    const authorizeSchool = async (targetSchoolCode) => {
      if (!targetSchoolCode) return false;
      if (callerRole === "admin") return true;
      if (callerRole === "area") {
        if (!callerSystemCode) return false;
        const dirs = await base44.asServiceRole.entities.SchoolDirectory.filter(
          { school_code: targetSchoolCode }, undefined, 1
        );
        return dirs.length > 0 && dirs[0].system_code === callerSystemCode;
      }
      return targetSchoolCode === callerSchoolCode;
    };

    // --- LIST COLLEAGUES (for the cover-teacher dropdown) ---
    if (action === "list_colleagues") {
      const schoolCode = params.school_code || callerSchoolCode;
      if (!(await authorizeSchool(schoolCode))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }
      const teachers = await base44.asServiceRole.entities.Teacher.filter(
        { school_code: schoolCode }, "full_name", 500
      );
      const colleagues = teachers
        .filter((t) => t.id !== callerId && t.active !== false && ["teacher", "manager", "school_admin"].includes(t.role))
        .map((t) => ({ id: t.id, full_name: t.full_name, subject: t.subject || "", role: t.role }));
      return Response.json({ success: true, colleagues });
    }

    // --- LIST COVERS (scoped to caller) ---
    if (action === "list") {
      const { cover_teacher_id, original_teacher_id, class_id, from_date, to_date } = params;
      const filter = {};
      if (callerRole === "admin") {
        if (params.school_code) filter.school_code = params.school_code;
      } else if (callerRole !== "area") {
        filter.school_code = callerSchoolCode;
      }
      if (cover_teacher_id) filter.cover_teacher_id = cover_teacher_id;
      if (original_teacher_id) filter.original_teacher_id = original_teacher_id;
      if (class_id) filter.class_id = class_id;

      let covers = await base44.asServiceRole.entities.ClassCover.filter(filter, "-cover_date", 500);

      if (callerRole === "area") {
        const dirs = await base44.asServiceRole.entities.SchoolDirectory.filter(
          { system_code: callerSystemCode }, undefined, 500
        );
        const sc = new Set(dirs.map((d) => d.school_code));
        covers = covers.filter((c) => sc.has(c.school_code));
      } else if (callerRole === "teacher") {
        // Teachers only see covers they arranged or are covering.
        covers = covers.filter(
          (c) => c.original_teacher_id === callerId || c.cover_teacher_id === callerId
        );
      }
      if (from_date) covers = covers.filter((c) => c.cover_date && c.cover_date >= from_date);
      if (to_date) covers = covers.filter((c) => c.cover_date && c.cover_date <= to_date);
      return Response.json({ success: true, covers });
    }

    // --- CHECK ACCESS (is this teacher an active cover for this class?) ---
    if (action === "check_access") {
      const { class_id, teacher_id } = params;
      if (!class_id || !teacher_id) {
        return Response.json({ success: true, allowed: false });
      }
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const covers = await base44.asServiceRole.entities.ClassCover.filter(
        { class_id, cover_teacher_id: teacher_id, status: "active" }, undefined, 50
      );
      const allowed = covers.some((c) => c.cover_date && c.cover_date >= since);
      return Response.json({ success: true, allowed });
    }

    // --- CREATE COVER ---
    if (action === "create") {
      const { class_id, cover_date, cover_teacher_id, original_teacher_id, notes } = params;
      if (!class_id || !cover_date || !cover_teacher_id) {
        return Response.json(
          { success: false, error: "class_id, cover_date and cover_teacher_id are required" },
          { status: 400 }
        );
      }
      let cls = null;
      try { cls = await base44.asServiceRole.entities.Class.get(class_id); } catch (e) { /* class may be missing */ }
      if (!cls) {
        // Fall back to a homeroom-linked class
        const hrs = await base44.asServiceRole.entities.Homeroom.filter({ class_id }, undefined, 1);
        if (hrs.length) {
          const h = hrs[0];
          cls = { id: class_id, class_name: h.homeroom_name, school_code: h.school_code, subject: "Homeroom", grade_level: h.grade_level || "", room: h.room || "" };
        }
      }
      if (!cls) {
        return Response.json({ success: false, error: "Class not found" }, { status: 404 });
      }
      const schoolCode = cls.school_code;
      if (!(await authorizeSchool(schoolCode))) {
        return Response.json({ success: false, error: "Not authorized for this school" }, { status: 403 });
      }

      const dow = dayOfWeek(cover_date);
      const slots = await base44.asServiceRole.entities.ClassSchedule.filter(
        { class_id, day_of_week: dow }, undefined, 10
      );

      // Permission: a teacher may only arrange cover for a class they teach.
      // Managers/area/admin may arrange cover for any class in their scope.
      let origTeacherId = original_teacher_id || "";
      let origTeacherName = "";
      if (callerRole === "teacher") {
        const ownsSlot = slots.some((s) => s.teacher_id === callerId);
        let ownsTc = false;
        if (!ownsSlot) {
          const tcs = await base44.asServiceRole.entities.TeacherClass.filter(
            { class_id, teacher_id: callerId }, undefined, 1
          );
          ownsTc = tcs.length > 0;
        }
        if (!ownsSlot && !ownsTc) {
          return Response.json(
            { success: false, error: "You can only arrange cover for classes you teach" },
            { status: 403 }
          );
        }
        origTeacherId = callerId;
        const me = await base44.asServiceRole.entities.Teacher.get(callerId).catch(() => null);
        origTeacherName = me?.full_name || "";
      } else {
        if (!origTeacherId) origTeacherId = slots[0]?.teacher_id || "";
        if (origTeacherId) {
          const t = await base44.asServiceRole.entities.Teacher.get(origTeacherId).catch(() => null);
          origTeacherName = t?.full_name || "";
        }
      }

      // Validate cover teacher: active and at the same school.
      const coverTeacher = await base44.asServiceRole.entities.Teacher.get(cover_teacher_id).catch(() => null);
      if (!coverTeacher) {
        return Response.json({ success: false, error: "Cover teacher not found" }, { status: 404 });
      }
      if (coverTeacher.active === false) {
        return Response.json({ success: false, error: "Cover teacher is inactive" }, { status: 400 });
      }
      if (coverTeacher.school_code !== schoolCode) {
        return Response.json({ success: false, error: "Cover teacher must be at the same school" }, { status: 400 });
      }
      if (coverTeacher.id === origTeacherId) {
        return Response.json({ success: false, error: "You cannot cover your own class" }, { status: 400 });
      }

      const slot = slots[0];
      const cover = await base44.asServiceRole.entities.ClassCover.create({
        school_code: schoolCode,
        original_teacher_id: origTeacherId,
        original_teacher_name: origTeacherName,
        cover_teacher_id: coverTeacher.id,
        cover_teacher_name: coverTeacher.full_name,
        class_id,
        class_name: cls.class_name || slot?.class_name || "",
        subject: cls.subject || "",
        room: slot?.room || cls.room || "",
        day_of_week: dow,
        start_time: slot?.start_time || "",
        end_time: slot?.end_time || "",
        cover_date,
        status: "active",
        notes: notes || "",
        created_by: callerName,
      });
      await logAudit(
        base44,
        "admin_action",
        callerName,
        callerRole,
        `Class cover arranged: ${cover.class_name} on ${cover_date} covered by ${coverTeacher.full_name}`,
        schoolCode
      );
      return Response.json({ success: true, cover });
    }

    // --- CANCEL COVER ---
    if (action === "cancel") {
      const { cover_id } = params;
      if (!cover_id) {
        return Response.json({ success: false, error: "cover_id is required" }, { status: 400 });
      }
      const cover = await base44.asServiceRole.entities.ClassCover.get(cover_id).catch(() => null);
      if (!cover) {
        return Response.json({ success: false, error: "Cover not found" }, { status: 404 });
      }
      if (!(await authorizeSchool(cover.school_code))) {
        return Response.json({ success: false, error: "Not authorized" }, { status: 403 });
      }
      if (callerRole === "teacher" && cover.original_teacher_id !== callerId) {
        return Response.json(
          { success: false, error: "Only the original teacher or an admin can cancel this cover" },
          { status: 403 }
        );
      }
      const updated = await base44.asServiceRole.entities.ClassCover.update(cover_id, { status: "cancelled" });
      await logAudit(
        base44,
        "admin_action",
        callerName,
        callerRole,
        `Class cover cancelled: ${cover.class_name} on ${cover.cover_date}`,
        cover.school_code
      );
      return Response.json({ success: true, cover: updated });
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}