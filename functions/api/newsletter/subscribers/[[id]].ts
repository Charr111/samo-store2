import { getCorsHeaders, verifyFirebaseAdminRequest } from '../../_auth';
import {
  readCatalogSnapshot,
  type D1DatabaseBinding,
  type Env,
} from '../../catalog';

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

export const onRequestOptions = async (context: { request?: Request }) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context?.request),
  });
};

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
}) => {
  const corsHeaders = getCorsHeaders(context.request);
  try {
    const db: D1DatabaseBinding | undefined =
      context.env.DB || context.env.SAMO_D1;
    const currentSnapshot = await readCatalogSnapshot(context.env);
    const extraAdmins = Array.isArray(currentSnapshot.admins)
      ? (currentSnapshot.admins as Array<{ email?: string }>)
      : [];

    const authCheck = await verifyFirebaseAdminRequest({
      authorizationHeader: context.request.headers.get('Authorization'),
      d1Db: db,
      extraAdminEmails: extraAdmins,
    });

    if (!authCheck.authorized) {
      return new Response(
        JSON.stringify({
          error: authCheck.error || 'Unauthorized admin access.',
        }),
        {
          status: authCheck.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!db) {
      return new Response(JSON.stringify({ subscribers: [] }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
    const subscribers = await readSubscribersFromD1(db);
    return new Response(JSON.stringify({ subscribers }), {
      status: 200,
      headers: {
        ...corsHeaders,
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
          ...corsHeaders,
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
  const corsHeaders = getCorsHeaders(context.request);
  try {
    const db: D1DatabaseBinding | undefined =
      context.env.DB || context.env.SAMO_D1;
    const currentSnapshot = await readCatalogSnapshot(context.env);
    const extraAdmins = Array.isArray(currentSnapshot.admins)
      ? (currentSnapshot.admins as Array<{ email?: string }>)
      : [];

    const authCheck = await verifyFirebaseAdminRequest({
      authorizationHeader: context.request.headers.get('Authorization'),
      d1Db: db,
      extraAdminEmails: extraAdmins,
    });

    if (!authCheck.authorized) {
      return new Response(
        JSON.stringify({
          error: authCheck.error || 'Unauthorized admin access.',
        }),
        {
          status: authCheck.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!db) {
      return new Response(
        JSON.stringify({ success: true, subscribers: [] }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
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
          ...corsHeaders,
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
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
