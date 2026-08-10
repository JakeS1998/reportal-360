import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    return Response.json({
      ready: false,
      message: 'Webhook receiver is awaiting Resend signature verification setup.'
    }, { status: 503 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}