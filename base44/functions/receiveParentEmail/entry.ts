import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

async function verifySignature(payload, headers) {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signature = headers.get('svix-signature');
  if (!id || !timestamp || !signature) return false;
  const secret = secrets.get('RESEND_WEBHOOK_SECRET').replace('whsec_', '');
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(secret), (char) => char.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${payload}`));
  const expected = toBase64(signed);
  return signature.split(' ').some((value) => value === `v1,${expected}`);
}

export default async function(req: Request): Promise<Response> {
  try {
    const payload = await req.text();
    if (!(await verifySignature(payload, req.headers))) return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });
    const event = JSON.parse(payload);
    if (event.type !== 'email.received') return Response.json({ received: true });
    const base44 = createClientFromRequest(req);
    const emailId = event.data?.email_id;
    const incoming = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, { headers: { Authorization: `Bearer ${secrets.get('RESEND_API_KEY')}` } });
    if (!incoming.ok) throw new Error('Could not retrieve inbound email');
    const incomingPayload = await incoming.json();
    const received = incomingPayload.data || incomingPayload;
    const recipient = (event.data?.to || event.data?.received_for || []).find((address) => address.includes('reply+')) || '';
    const match = recipient.match(/reply\+([^@]+)@/i);
    if (!match) return Response.json({ received: true });
    const conversation = await base44.asServiceRole.entities.ParentConversation.get(match[1]);
    const senderEmail = String(event.data?.from || received.from || '').match(/<([^>]+)>/)?.[1] || String(event.data?.from || received.from || '').trim().toLowerCase();
    if (!conversation || senderEmail.toLowerCase() !== conversation.parent_email.toLowerCase()) return Response.json({ received: true });
    const body = String(received.text || received.html || '').replace(/<[^>]*>/g, '').trim();
    if (!body) return Response.json({ received: true });
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.ParentEmailMessage.create({ conversation_id: conversation.id, direction: 'inbound', sender_name: conversation.parent_name, sender_email: senderEmail, body, sent_at: now, resend_email_id: emailId });
    await base44.asServiceRole.entities.ParentConversation.update(conversation.id, { last_message_at: now, last_message_preview: body.slice(0, 160), unread_for_teacher: true, status: 'open' });
    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}