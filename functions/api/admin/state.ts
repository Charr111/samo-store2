import { getCorsHeaders, verifyFirebaseAdminRequest } from '../_auth';
import {
  readCatalogSnapshot,
  sanitizeCatalogStateForClient,
  type Env,
} from '../catalog';

export const onRequestOptions = async (context: {
  request?: Request;
}): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context?.request),
  });
};

export const onRequestGet = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const corsHeaders = getCorsHeaders(context.request);
  try {
    const d1Binding = context.env.DB || context.env.SAMO_D1;
    const snapshot = await readCatalogSnapshot(context.env);
    const extraAdmins = Array.isArray(snapshot.admins)
      ? (snapshot.admins as Array<{ email?: string }>)
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

    return new Response(
      JSON.stringify(sanitizeCatalogStateForClient(snapshot)),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : 'Failed to load admin catalog state.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};
