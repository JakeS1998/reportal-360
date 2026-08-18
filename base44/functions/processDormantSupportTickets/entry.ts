import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const tickets = await base44.asServiceRole.entities.StaffMessage.filter({ type: 'alert', ticket_status: 'awaiting_customer' }, 'last_response_at', 5000);
    const dormant = tickets.filter((ticket) => new Date(ticket.last_response_at || ticket.updated_date || ticket.created_date).getTime() <= cutoff);
    if (!dormant.length) return Response.json({ success: true, dormant_count: 0 });
    await base44.asServiceRole.entities.StaffMessage.bulkUpdate(dormant.map((ticket) => ({ id: ticket.id, ticket_status: 'dormant', sla_due_at: null })));
    await base44.asServiceRole.entities.StaffMessage.bulkCreate(dormant.map((ticket) => ({ school_code: ticket.school_code, system_code: ticket.system_code || '', thread_id: ticket.thread_id, sender_id: 'system', sender_name: 'ReportAL 360 Support', recipient_id: ticket.sender_id, recipient_name: ticket.sender_name || 'Teacher', type: 'message', content: 'Your support request has been marked dormant because we have not heard back for 48 hours. Reply here whenever you are ready to continue.' })));
    return Response.json({ success: true, dormant_count: dormant.length });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}