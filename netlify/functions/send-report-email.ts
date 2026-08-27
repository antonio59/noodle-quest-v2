import type { Context } from '@netlify/functions';

const ALLOWED_ORIGINS = new Set([
  'https://noodle.antoniosmith.xyz',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
]);

function clip(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const origin = req.headers.get('origin') ?? '';
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden origin' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const reportSecret = Netlify.env.get('REPORT_EMAIL_SECRET');
  if (!reportSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Email reports not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const provided = req.headers.get('X-Report-Secret') ?? '';
  if (provided.length !== reportSecret.length) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  let mismatch = 0;
  for (let i = 0; i < reportSecret.length; i++) {
    mismatch |= provided.charCodeAt(i) ^ reportSecret.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const gameName = clip(body.gameName, 80) || 'Unknown';
    const playerName = clip(body.playerName, 40) || 'Anonymous';
    const category = clip(body.category, 40) || 'general';
    const description = clip(body.description, 2000);
    if (!description) {
      return new Response(JSON.stringify({ ok: false, error: 'Description required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adminEmail = Netlify.env.get('ADMIN_EMAIL');
    const resendKey = Netlify.env.get('RESEND_API_KEY');

    if (!adminEmail || !resendKey) {
      return new Response(JSON.stringify({ ok: true, emailed: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailBody = `
Game Issue Report

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
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Noodle Quest <reports@noodle.antoniosmith.xyz>',
        to: adminEmail,
        subject: `Game Report: ${gameName} — ${category}`,
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
