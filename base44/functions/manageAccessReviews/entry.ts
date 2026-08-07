import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { logAudit, getAdminCredentials } from '../../shared/security.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, caller_username, caller_password, ...params } = body;

    // --- Authenticate caller ---
    const admin = getAdminCredentials();
    let callerRole = null;
    let callerSchoolCode = null;
    let callerSystemCode = null;
    let callerName = "";

    if (caller_username === admin.username && caller_password === admin.password) {
      callerRole = "admin";
      callerName = "admin";
    } else if (caller_username) {
      const callers = await base44.asServiceRole.entities.Teacher.filter({
        username: caller_username,
        password: caller_password,
      });
      if (callers.length === 0) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 403 });
      }
      callerRole = callers[0].role;
      callerSchoolCode = callers[0].school_code;
      callerSystemCode = callers[0].system_code;
      callerName = callers[0].username;
    } else {
      return Response.json({ success: false, error: "Caller credentials required" }, { status: 403 });
    }

    if (callerRole !== "admin" && callerRole !== "manager" && callerRole !== "area") {
      return Response.json({ success: false, error: "Not authorized to manage access reviews" }, { status: 403 });
    }

    // --- GET ACTIVE REVIEW(S) ---
    if (action === "get_active") {
      const filter: any = { status: "active" };
      if (callerRole === "manager") {
        filter.school_code = callerSchoolCode;
      } else if (callerRole === "area") {
        filter.system_code = callerSystemCode;
      }
      if (params.school_code) filter.school_code = params.school_code;
      const reviews = await base44.asServiceRole.entities.AccessReview.filter(filter, "-started_date", 50);
      return Response.json({ success: true, reviews });
    }

    // --- COMPLETE REVIEW ---
    if (action === "complete") {
      const { review_id, notes } = params;
      if (!review_id) {
        return Response.json({ success: false, error: "review_id is required" }, { status: 400 });
      }
      const review = await base44.asServiceRole.entities.AccessReview.get(review_id);
      if (!review) {
        return Response.json({ success: false, error: "Review not found" }, { status: 404 });
      }
      if (review.status === "completed") {
        return Response.json({ success: false, error: "This review has already been completed" }, { status: 400 });
      }
      if (callerRole === "manager" && review.school_code !== callerSchoolCode) {
        return Response.json({ success: false, error: "You can only complete the review for your own school" }, { status: 403 });
      }
      if (callerRole === "area" && review.system_code !== callerSystemCode) {
        return Response.json({ success: false, error: "You can only complete reviews within your system" }, { status: 403 });
      }
      await base44.asServiceRole.entities.AccessReview.update(review_id, {
        status: "completed",
        completed_date: new Date().toISOString().split("T")[0],
        completed_by: callerName,
        notes: notes || "",
      });
      await logAudit(
        base44,
        "admin_action",
        callerName,
        callerRole,
        `Completed annual access review for ${review.school_name || review.school_code} (${review.year})`,
        review.school_code,
        { action_type: "access_review_completed" }
      );
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}