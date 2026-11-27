import type { D1DatabaseBinding, Env } from '../catalog';
import {
  NEWSLETTER_CORS_HEADERS,
  resolveWorkerClientIp,
  workerSubscribedNewsletterIpsMemory,
} from './_memory';

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: NEWSLETTER_CORS_HEADERS });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as {
      email?: unknown;
      phone?: unknown;
      source?: unknown;
    };

    const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const source: 'footer' | 'popup' =
      body.source === 'popup' ? 'popup' : 'footer';

    const hasValidEmail = rawEmail.includes('@') && rawEmail.includes('.');
    const phoneDigits = (rawPhone || (!hasValidEmail ? rawEmail : '')).replace(
      /[^\d]/g,
      ''
    );
    const hasValidPhone = phoneDigits.length >= 8;

    if (!hasValidEmail && !hasValidPhone) {
      return new Response(
        JSON.stringify({
          error: 'Please provide a valid email address or phone number.',
        }),
        {
          status: 400,
          headers: {
            ...NEWSLETTER_CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const normalizedEmail = hasValidEmail ? rawEmail.toLowerCase() : '';
    const cleanPhone = rawPhone || (!hasValidEmail ? rawEmail : '');

    const newSub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: normalizedEmail || cleanPhone,
      ...(cleanPhone ? { phone: cleanPhone } : {}),
      source,
      subscribedAt: new Date().toISOString(),
    };

    const clientIp = resolveWorkerClientIp(context.request);
    if (clientIp) {
      workerSubscribedNewsletterIpsMemory.add(clientIp);
    }

    const db: D1DatabaseBinding | undefined =
      context.env.DB || context.env.SAMO_D1;
    let allSubscribers = [newSub];

    if (db) {
      await db
        .prepare(
          `INSERT INTO newsletter_subscribers (id, email, phone, source, subscribed_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
             phone=excluded.phone,
             source=excluded.source;`
        )
        .bind(
          newSub.id,
          newSub.email.toLowerCase().trim(),
          cleanPhone || null,
          newSub.source,
          newSub.subscribedAt
        )
        .run();

      const res = await db
        .prepare(
          'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC;'
        )
        .all<any>();
      allSubscribers = (res.results || []).map((r: any) => ({
        id: r.id,
        email: r.email,
        ...(r.phone ? { phone: r.phone } : {}),
        source: r.source === 'popup' ? 'popup' : 'footer',
        subscribedAt: r.subscribed_at,
      }));
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriber: newSub,
        subscribers: allSubscribers,
      }),
      {
        status: 200,
        headers: {
          ...NEWSLETTER_CORS_HEADERS,
          'Content-Type': 'application/json',
          'Set-Cookie':
            'samo_nl_subscribed=1; Path=/; Max-Age=31536000; SameSite=Lax',
        },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to persist newsletter subscription to D1 SQL.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...NEWSLETTER_CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  }
};
