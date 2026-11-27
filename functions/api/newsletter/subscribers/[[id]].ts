import type { D1DatabaseBinding, Env } from '../../catalog';
import { NEWSLETTER_CORS_HEADERS } from '../_memory';

async function readSubscribersFromD1(db: D1DatabaseBinding) {
  const res = await db
    .prepare(
      'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC;'
    )
    .all<any>();
  return (res.results || []).map((r: any) => ({
    id: r.id,
    email: r.email,
    ...(r.phone ? { phone: r.phone } : {}),
    source: r.source === 'popup' ? 'popup' : 'footer',
    subscribedAt: r.subscribed_at,
  }));
}

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: NEWSLETTER_CORS_HEADERS });
};

export const onRequestGet = async (context: { env: Env }) => {
  try {
    const db: D1DatabaseBinding | undefined =
      context.env.DB || context.env.SAMO_D1;
    if (!db) {
      return new Response(JSON.stringify({ subscribers: [] }), {
        status: 200,
        headers: {
          ...NEWSLETTER_CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      });
    }
    const subscribers = await readSubscribersFromD1(db);
    return new Response(JSON.stringify({ subscribers }), {
      status: 200,
      headers: {
        ...NEWSLETTER_CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch newsletter subscribers from D1 SQL.',
      }),
      {
        status: 500,
        headers: {
          ...NEWSLETTER_CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const onRequestDelete = async (context: {
  request: Request;
  env: Env;
  params: { id?: string | string[] };
}) => {
  try {
    const db: D1DatabaseBinding | undefined =
      context.env.DB || context.env.SAMO_D1;
    if (!db) {
      return new Response(
        JSON.stringify({ success: true, subscribers: [] }),
        {
          status: 200,
          headers: {
            ...NEWSLETTER_CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const rawParam = context.params?.id;
    const targetId = decodeURIComponent(
      Array.isArray(rawParam) ? rawParam[0] || '' : rawParam || ''
    ).trim();

    if (targetId) {
      const all = await readSubscribersFromD1(db);
      const target = all.find(
        (s) =>
          s.id === targetId ||
          String(s.email).toLowerCase() === targetId.toLowerCase()
      );
      if (target) {
        await db
          .prepare(
            'DELETE FROM newsletter_subscribers WHERE LOWER(email) = ?;'
          )
          .bind(String(target.email).toLowerCase().trim())
          .run();
      }
    }

    const subscribers = await readSubscribersFromD1(db);
    return new Response(
      JSON.stringify({ success: true, subscribers }),
      {
        status: 200,
        headers: {
          ...NEWSLETTER_CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Failed to delete subscriber from D1 SQL.' }),
      {
        status: 500,
        headers: {
          ...NEWSLETTER_CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
