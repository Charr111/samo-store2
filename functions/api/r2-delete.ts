import { getCorsHeaders, verifyFirebaseAdminRequest } from './_auth';
import { readCatalogSnapshot, type D1DatabaseBinding } from './catalog';

export interface R2BucketBinding {
  delete(keys: string | string[]): Promise<void>;
}

export interface Env {
  SAMO_R2_BUCKET?: R2BucketBinding;
  DB?: D1DatabaseBinding;
  SAMO_D1?: D1DatabaseBinding;
}

export const onRequestOptions = async (context: {
  request?: Request;
}): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context?.request),
  });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const corsHeaders = getCorsHeaders(context.request);
  try {
    const d1Binding = context.env.DB || context.env.SAMO_D1;
    const currentSnapshot = await readCatalogSnapshot({
      DB: context.env.DB,
      SAMO_D1: context.env.SAMO_D1,
    });
    const extraAdmins = Array.isArray(currentSnapshot.admins)
      ? (currentSnapshot.admins as Array<{ email?: string }>)
      : [];

    const authCheck = await verifyFirebaseAdminRequest({
      authorizationHeader: context.request.headers.get('Authorization'),
      d1Db: d1Binding,
      extraAdminEmails: extraAdmins,
    });

    if (!authCheck.authorized) {
      return new Response(
        JSON.stringify({
          error: authCheck.error || 'Unauthorized admin access.',
        }),
        {
          status: authCheck.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = (await context.request.json()) as {
      keys?: string[];
    };

    const rawKeys = Array.isArray(body?.keys) ? body.keys : [];
    const safeKeys = rawKeys
      .map((k) => (typeof k === 'string' ? k.trim().replace(/^\/+/, '') : ''))
      .filter(
        (k) =>
          Boolean(k) &&
          (k.startsWith('products/') || k.startsWith('banners/'))
      );

    if (safeKeys.length === 0) {
      return new Response(JSON.stringify({ deletedKeys: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (context.env.SAMO_R2_BUCKET) {
      await context.env.SAMO_R2_BUCKET.delete(safeKeys);
    }

    return new Response(
      JSON.stringify({
        deletedKeys: safeKeys,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to delete media from Cloudflare R2.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
