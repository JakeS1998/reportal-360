import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveStaffCaller } from '../../shared/resolveStaffCaller.ts';

const hexColor = (value) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);

export default async function(req) {
  try {
    const body = await req.json();
    const { action, caller_username, caller_password, caller_email, caller_sso, school_code, system_code, school_name, logo_url, header_color, menu_text_color } = body;
    const base44 = createClientFromRequest(req);
    const caller = await resolveStaffCaller(base44, { callerUsername: caller_username, callerPassword: caller_password, callerEmail: caller_email, callerSso: caller_sso });
    if (!caller) return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    if (!school_code || caller.school_code !== school_code) return Response.json({ success: false, error: 'School access required' }, { status: 403 });
    const schools = await base44.asServiceRole.entities.School.filter({ school_code, system_code: caller.system_code }, '-updated_date', 1);
    const existing = schools[0];
    if (action === 'get') return Response.json({ success: true, branding: existing ? { logo_url: existing.logo_url, header_color: existing.header_color, menu_text_color: existing.menu_text_color } : {} });
    if (action !== 'save' || caller.role !== 'manager') return Response.json({ success: false, error: 'Manager access required' }, { status: 403 });
    if (!hexColor(header_color) || !hexColor(menu_text_color)) return Response.json({ success: false, error: 'Use valid six-digit hex colors' }, { status: 400 });
    const branding = { logo_url: logo_url || '', header_color, menu_text_color };
    if (existing) await base44.asServiceRole.entities.School.update(existing.id, branding);
    else await base44.asServiceRole.entities.School.create({ school_name: school_name || caller.school_name || school_code, school_code, system_code: system_code || caller.system_code || '', ...branding });
    return Response.json({ success: true, branding });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}