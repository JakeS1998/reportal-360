import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getAdminCredentials, logAudit } from '../../shared/security.ts';

const { username: ADMIN_USERNAME, password: ADMIN_PASSWORD } = getAdminCredentials();

export default async function(req) {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, ...params } = body;
    const base44 = createClientFromRequest(req);

    // --- Authenticate caller ---
    let callerRole = null;
    let callerSystemCode = null;
    let callerSchoolCode = null;
    let callerUserId = null;
    let callerFullName = null;

    if (caller_username === ADMIN_USERNAME && caller_password === ADMIN_PASSWORD) {
      callerRole = "admin";
    } else if (caller_username) {
      const callers = await base44.asServiceRole.entities.Teacher.filter({ username: caller_username });
      if (callers.length === 0) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      if (caller_password && callers[0].password !== caller_password) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      callerRole = callers[0].role;
      callerSystemCode = callers[0].system_code;
      callerSchoolCode = callers[0].school_code;
      callerUserId = callers[0].id;
      callerFullName = callers[0].full_name;
    } else {
      return Response.json({ success: false, error: "Caller credentials required" }, { status: 403 });
    }

    // --- LIST MODULES ---
    if (action === "list_modules") {
      const modules = await base44.asServiceRole.entities.TrainingModule.filter({ active: true }, "order", 50);
      const roleModules = modules.filter(m => {
        if (!m.target_roles || m.target_roles.length === 0) return true;
        return m.target_roles.includes(callerRole);
      });
      const completions = callerUserId
        ? await base44.asServiceRole.entities.TrainingCompletion.filter({ user_id: callerUserId }, "-updated_date", 100)
        : [];
      return Response.json({ success: true, modules: roleModules, completions });
    }

    // --- GET MODULE ---
    if (action === "get_module") {
      const { module_id } = params;
      if (!module_id) {
        return Response.json({ success: false, error: "module_id is required" }, { status: 400 });
      }
      const mod = await base44.asServiceRole.entities.TrainingModule.get(module_id);
      if (!mod) {
        return Response.json({ success: false, error: "Module not found" }, { status: 404 });
      }
      const completions = callerUserId
        ? await base44.asServiceRole.entities.TrainingCompletion.filter({ user_id: callerUserId, module_id }, "-updated_date", 10)
        : [];
      return Response.json({ success: true, module: mod, completion: completions[0] || null });
    }

    // --- SUBMIT EXAM ---
    if (action === "submit_exam") {
      const { module_id, answers } = params;
      if (!module_id) {
        return Response.json({ success: false, error: "module_id is required" }, { status: 400 });
      }
      if (!callerUserId) {
        return Response.json({ success: false, error: "Only staff accounts can submit exams" }, { status: 403 });
      }
      const mod = await base44.asServiceRole.entities.TrainingModule.get(module_id);
      if (!mod) {
        return Response.json({ success: false, error: "Module not found" }, { status: 404 });
      }
      const questions = mod.questions || [];
      let correct = 0;
      questions.forEach((q, i) => {
        if (answers && answers[i] !== undefined && answers[i] === q.correct_answer) correct++;
      });
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
      const passed = score >= (mod.passing_score || 80);

      const existing = await base44.asServiceRole.entities.TrainingCompletion.filter(
        { user_id: callerUserId, module_id }, "-updated_date", 10
      );
      const attempts = (existing[0]?.attempts || 0) + 1;
      const completionData = {
        username: caller_username,
        full_name: callerFullName || "",
        module_title: mod.title,
        school_code: callerSchoolCode || "",
        system_code: callerSystemCode || "",
        role: callerRole,
        status: passed ? "completed" : "failed",
        score,
        answers: JSON.stringify(answers || {}),
        attempts,
        passed,
        completed_date: passed ? new Date().toISOString() : (existing[0]?.completed_date || null),
      };

      let completionId;
      if (existing.length > 0) {
        await base44.asServiceRole.entities.TrainingCompletion.update(existing[0].id, completionData);
        completionId = existing[0].id;
      } else {
        const created = await base44.asServiceRole.entities.TrainingCompletion.create({
          user_id: callerUserId,
          module_id,
          ...completionData,
        });
        completionId = created.id;
      }

      await logAudit(base44, "admin_action", caller_username, callerRole,
        `Training: ${mod.title} — ${passed ? "PASSED" : "FAILED"} (${score}%)`,
        callerSchoolCode);

      return Response.json({ success: true, score, passed, correct, total: questions.length, completion_id: completionId });
    }

    // --- LIST COMPLETIONS (manager/area/admin only) ---
    if (action === "list_completions") {
      if (callerRole === "teacher") {
        return Response.json({ success: false, error: "Not authorized to view training dashboard" }, { status: 403 });
      }
      const { school_code, system_code } = params;
      let staffFilter: any = { active: true };
      if (callerRole === "admin") {
        if (school_code) staffFilter.school_code = school_code;
        if (system_code) staffFilter.system_code = system_code;
      } else if (callerRole === "area") {
        staffFilter.system_code = callerSystemCode;
        if (school_code) staffFilter.school_code = school_code;
      } else if (callerRole === "manager") {
        staffFilter.school_code = callerSchoolCode;
      }

      const [staff, completions, modules] = await Promise.all([
        base44.asServiceRole.entities.Teacher.filter(staffFilter, "full_name", 500),
        base44.asServiceRole.entities.TrainingCompletion.filter(staffFilter, "-updated_date", 1000),
        base44.asServiceRole.entities.TrainingModule.filter({ active: true }, "order", 50),
      ]);

      return Response.json({ success: true, staff, completions, modules });
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}