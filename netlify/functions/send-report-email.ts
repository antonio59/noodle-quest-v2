import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const { gameName, playerName, category, description } = body;

    const adminEmail = Netlify.env.get('ADMIN_EMAIL');
    const resendKey = Netlify.env.get('RESEND_API_KEY');

    // If no email config, just accept the report silently
    if (!adminEmail || !resendKey) {
      return new Response(JSON.stringify({ ok: true, emailed: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailBody = `
🎮 Game Issue Report

Game: ${gameName}
Reported by: ${playerName}
Category: ${category}

Description:
${description}

---
View all reports at: https://noodle.antoniosmith.xyz/admin/reports
    `.trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Noodle Quest <reports@noodle.antoniosmith.xyz>',
        to: adminEmail,
        subject: `🐛 Game Report: ${gameName} — ${category}`,
        text: emailBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ ok: false, error: 'Email failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, emailed: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Email function error:', e);
    return new Response(JSON.stringify({ ok: false, error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
