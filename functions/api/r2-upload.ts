import {
  getCorsHeaders,
  validateAndBuildR2UploadObjectKey,
  verifyFirebaseAdminRequest,
} from './_auth';
import { readCatalogSnapshot, type D1DatabaseBinding } from './catalog';

export interface R2BucketBinding {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    }
  ): Promise<unknown>;
}

export interface Env {
  SAMO_R2_BUCKET?: R2BucketBinding;
  R2_PUBLIC_BASE_URL?: string;
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
      fileName?: string;
      contentType?: string;
      base64Data?: string;
      folder?: string;
    };

    const { fileName, contentType, base64Data, folder } = body || {};
    if (!base64Data || typeof base64Data !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing base64Data payload.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validatedKey = validateAndBuildR2UploadObjectKey({
      fileName,
      contentType,
      folder,
    });

    if (!validatedKey.ok) {
      return new Response(
        JSON.stringify({ error: validatedKey.error }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!context.env.SAMO_R2_BUCKET) {
      return new Response(
        JSON.stringify({
          error:
            'Cloudflare R2 bucket binding SAMO_R2_BUCKET is not configured on this Pages Function.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const rawBase64 = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;
    const binaryString = atob(rawBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    if (bytes.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: 'Decoded media buffer is empty.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { isVideo, mimeType, objectKey } = validatedKey;
    const maxAllowedBytes = isVideo ? 35 * 1024 * 1024 : 25 * 1024 * 1024;

    if (bytes.byteLength > maxAllowedBytes) {
      return new Response(
        JSON.stringify({
          error: isVideo
            ? 'Video exceeds the 35 MB maximum upload size.'
            : 'Image exceeds 25 MB maximum upload size.',
        }),
        {
          status: 413,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await context.env.SAMO_R2_BUCKET.put(objectKey, bytes.buffer, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    const publicBaseUrl = (
      context.env.R2_PUBLIC_BASE_URL || 'https://images.samoweave.com'
    )
      .trim()
      .replace(/\/+$/, '');

    return new Response(
      JSON.stringify({
        url: `${publicBaseUrl}/${objectKey}`,
        key: objectKey,
        sizeBytes: bytes.byteLength,
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
        : 'Failed to upload image to Cloudflare R2.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};
