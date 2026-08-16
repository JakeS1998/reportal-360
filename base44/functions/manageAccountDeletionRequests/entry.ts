import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, request_id, caller_username, caller_password, caller_email, caller_sso } = await req.json();
    const caller = await resolveStaffCaller(base44, {
      callerUsername: caller_username,
      callerPassword: caller_password,
      callerEmail: caller_email,
      callerSso: caller_sso,
    });
    if (!caller) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });

    if (action === 'request') {
      const existing = await base44.asServiceRole.entities.AccountDeletionRequest.filter({ staff_id: caller.id, status: 'pending' }, '-created_date', 1);
      if (existing.length) return Response.json({ success: true, already_requested: true });
      await base44.asServiceRole.entities.AccountDeletionRequest.create({
        staff_id: caller.id,
        staff_name: caller.full_name || caller.username,
        username: caller.username,
        school_code: caller.school_code,
        system_code: caller.system_code,
        status: 'pending',
      });
      return Response.json({ success: true });
    }

    if (caller.role !== 'manager') return Response.json({ success: false, error: 'School manager access required' }, { status: 403 });

    if (action === 'list') {
      const requests = await base44.asServiceRole.entities.AccountDeletionRequest.filter({ school_code: caller.school_code, status: 'pending' }, '-created_date', 100);
      return Response.json({ success: true, requests });
    }

    if (action === 'approve') {
      if (!request_id) return Response.json({ success: false, error: 'Request ID is required' }, { status: 400 });
      const request = await base44.asServiceRole.entities.AccountDeletionRequest.get(request_id);
      if (!request || request.status !== 'pending' || request.school_code !== caller.school_code) return Response.json({ success: false, error: 'Request not found' }, { status: 404 });
      const deletion = await base44.asServiceRole.functions.invoke('manageSchoolStaff', {
        action: 'delete',
        caller_username,
        caller_password,
        caller_email,
        caller_sso,
        user_id: request.staff_id,
      });
      if (!deletion.data?.success) return Response.json({ success: false, error: deletion.data?.error || 'Unable to delete account' }, { status: 400 });
      await base44.asServiceRole.entities.AccountDeletionRequest.update(request.id, {
        status: 'approved',
        approved_by_id: caller.id,
        approved_by_name: caller.full_name || caller.username,
        approved_at: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}