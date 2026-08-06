const SALES_EMAIL = "sales@blueridge-group.co.uk";

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

export default async function(req) {
  try {
    const body = await req.json();
    const { name, email, organization, role, message, _hp } = body || {};

    // Honeypot — silently accept bot submissions
    if (_hp) return Response.json({ success: true });

    if (!name || !email || !message) {
      return Response.json(
        { success: false, error: "Name, email, and message are required." },
        { status: 400 }
      );
    }
    if (message.length > 4000 || name.length > 200 || email.length > 200) {
      return Response.json(
        { success: false, error: "One or more fields are too long." },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "ReportAL 360 <onboarding@resend.dev>";

    if (!apiKey) {
      return Response.json(
        { success: false, error: "Email service is not configured." },
        { status: 500 }
      );
    }

    const subject = `New sales enquiry from ${esc(name)}`;
    const html = `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0B1530; margin-bottom: 4px;">New sales enquiry — ReportAL 360</h2>
        <p style="color: #64748b; margin-top: 0;">Submitted via the landing page contact form.</p>
        <table style="width:100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr><td style="padding:6px 0; color:#64748b; width:150px;">Name</td><td style="padding:6px 0;">${esc(name)}</td></tr>
          <tr><td style="padding:6px 0; color:#64748b;">Email</td><td style="padding:6px 0;"><a href="mailto:${esc(email)}" style="color:#9E1B32;">${esc(email)}</a></td></tr>
          <tr><td style="padding:6px 0; color:#64748b;">School / System</td><td style="padding:6px 0;">${esc(organization) || "—"}</td></tr>
          <tr><td style="padding:6px 0; color:#64748b;">Role</td><td style="padding:6px 0;">${esc(role) || "—"}</td></tr>
        </table>
        <h3 style="color:#0B1530; font-size:14px; margin-bottom:8px;">Message</h3>
        <p style="background:#f8fafc; border-radius:8px; padding:16px; white-space:pre-wrap; color:#334155; margin:0;">${esc(message)}</p>
        <p style="color:#94a3b8; font-size:12px; margin-top:24px;">Reply directly to this email to respond to ${esc(name)}.</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: SALES_EMAIL,
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      return Response.json(
        { success: false, error: "Failed to send enquiry. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}