export const SUPER_ADMIN_EMAILS: readonly string[] = [
  'apolokor@gmail.com',
  'joeykorab88@gmail.com',
  'samobougharios@gmail.com',
];

export const FORBIDDEN_ADMIN_EMAILS: readonly string[] = [
  'charbelkorab11123@gmail.com',
];

export const FIREBASE_PROJECT_ID = 'samo-store-ac7dd';
export const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
export const GOOGLE_SECURETOKEN_JWK_URL =
  'https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com';

export const ALLOWED_R2_UPLOAD_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export function isAllowedCorsOrigin(
  origin: string | null | undefined
): boolean {
  if (!origin || typeof origin !== 'string') return false;
  const trimmed = origin.trim();
  if (!trimmed) return false;
  if (
    trimmed === 'https://samoweave.com' ||
    trimmed === 'https://www.samoweave.com'
  ) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.protocol === 'https:' &&
      (host.endsWith('.pages.dev') || host.endsWith('.run.app'))
    ) {
      return true;
    }
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (host === 'localhost' || host === '127.0.0.1')
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function getCorsHeaders(
  requestOrOrigin?: Request | string | null,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  const rawOrigin =
    typeof requestOrOrigin === 'string'
      ? requestOrOrigin
      : requestOrOrigin && typeof requestOrOrigin.headers?.get === 'function'
      ? requestOrOrigin.headers.get('Origin')
      : null;

  const allowOrigin = isAllowedCorsOrigin(rawOrigin)
    ? rawOrigin!.trim()
    : 'https://samoweave.com';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Samo-Sheet-Secret',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    ...(extraHeaders || {}),
  };
}

interface GoogleJwkKey extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

let cachedJwkSet: { keys: GoogleJwkKey[]; expiresAt: number } | null = null;

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtSegmentJson<T = Record<string, unknown>>(
  segment: string
): T | null {
  try {
    const bytes = base64UrlToUint8Array(segment);
    const jsonText = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonText);
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

async function fetchGooglePublicJwks(
  forceRefresh = false
): Promise<GoogleJwkKey[]> {
  const now = Date.now();
  if (!forceRefresh && cachedJwkSet && now < cachedJwkSet.expiresAt) {
    return cachedJwkSet.keys;
  }

  const resp = await fetch(GOOGLE_SECURETOKEN_JWK_URL, {
    method: 'GET',
  });
  if (!resp.ok) {
    throw new Error(
      `Failed to fetch Google SecureToken JWKs (HTTP ${resp.status}).`
    );
  }

  let ttlMs = 3600_000;
  const cacheControl = resp.headers.get('Cache-Control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  if (maxAgeMatch) {
    const parsedSecs = Number(maxAgeMatch[1]);
    if (Number.isFinite(parsedSecs) && parsedSecs > 60) {
      ttlMs = parsedSecs * 1000;
    }
  }

  const data = (await resp.json()) as { keys?: GoogleJwkKey[] };
  const keys = Array.isArray(data?.keys) ? data.keys : [];
  cachedJwkSet = {
    keys,
    expiresAt: now + ttlMs,
  };
  return keys;
}

export interface D1AdminLookupBinding {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(colName?: string): Promise<T | null>;
      all<T = unknown>(): Promise<{ results: T[]; success?: boolean }>;
    };
  };
}

export interface VerifyAdminAuthOptions {
  authorizationHeader?: string | null;
  d1Db?: D1AdminLookupBinding;
  extraAdminEmails?: Array<string | { email?: string }>;
}

export interface VerifyAdminAuthResult {
  authorized: boolean;
  status: number;
  email?: string;
  uid?: string;
  error?: string;
}

export function isEmailInAdminAllowlist(
  rawEmail: string | null | undefined,
  extraAdmins?: Array<string | { email?: string }>
): boolean {
  if (!rawEmail || typeof rawEmail !== 'string') return false;
  const normalized = rawEmail.trim().toLowerCase();
  if (!normalized || FORBIDDEN_ADMIN_EMAILS.includes(normalized)) {
    return false;
  }
  if (SUPER_ADMIN_EMAILS.includes(normalized)) {
    return true;
  }
  if (Array.isArray(extraAdmins)) {
    for (const entry of extraAdmins) {
      const candidate =
        typeof entry === 'string'
          ? entry.trim().toLowerCase()
          : typeof entry?.email === 'string'
          ? entry.email.trim().toLowerCase()
          : '';
      if (
        candidate &&
        !FORBIDDEN_ADMIN_EMAILS.includes(candidate) &&
        candidate === normalized
      ) {
        return true;
      }
    }
  }
  return false;
}

export async function verifyFirebaseAdminRequest(
  options: VerifyAdminAuthOptions
): Promise<VerifyAdminAuthResult> {
  try {
    const authHeader = (options.authorizationHeader || '').trim();
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return {
        authorized: false,
        status: 401,
        error: 'Authentication required: missing Bearer token.',
      };
    }

    const token = authHeader.slice(7).trim();
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      return {
        authorized: false,
        status: 401,
        error: 'Malformed Firebase ID token.',
      };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = decodeJwtSegmentJson<{ alg?: string; kid?: string }>(
      headerB64
    );
    const payload = decodeJwtSegmentJson<{
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      email_verified?: boolean;
    }>(payloadB64);

    if (!header || header.alg !== 'RS256' || !header.kid) {
      return {
        authorized: false,
        status: 401,
        error: 'Invalid token header algorithm or key ID.',
      };
    }

    if (!payload) {
      return {
        authorized: false,
        status: 401,
        error: 'Invalid token payload.',
      };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) {
      return {
        authorized: false,
        status: 401,
        error: 'Token audience mismatch.',
      };
    }
    if (payload.iss !== FIREBASE_ISSUER) {
      return {
        authorized: false,
        status: 401,
        error: 'Token issuer mismatch.',
      };
    }
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub.trim() ||
      payload.sub.length > 128
    ) {
      return {
        authorized: false,
        status: 401,
        error: 'Invalid token subject.',
      };
    }
    if (typeof payload.exp !== 'number' || payload.exp < nowSec - 30) {
      return {
        authorized: false,
        status: 401,
        error: 'Firebase ID token has expired.',
      };
    }
    if (typeof payload.iat !== 'number' || payload.iat > nowSec + 60) {
      return {
        authorized: false,
        status: 401,
        error: 'Invalid token issue time.',
      };
    }
    if (
      payload.email_verified !== true ||
      typeof payload.email !== 'string' ||
      !payload.email.trim()
    ) {
      return {
        authorized: false,
        status: 403,
        error: 'Verified admin email is required.',
      };
    }

    const email = payload.email.trim().toLowerCase();
    if (FORBIDDEN_ADMIN_EMAILS.includes(email)) {
      return {
        authorized: false,
        status: 403,
        error: 'Access denied for this email address.',
      };
    }

    // Verify RS256 signature against Google public JWKs using Web Crypto
    let jwks = await fetchGooglePublicJwks(false);
    let matchingJwk = jwks.find((k) => k.kid === header.kid);
    if (!matchingJwk) {
      jwks = await fetchGooglePublicJwks(true);
      matchingJwk = jwks.find((k) => k.kid === header.kid);
    }
    if (!matchingJwk) {
      return {
        authorized: false,
        status: 401,
        error: 'Unable to find matching Google JWK for token key ID.',
      };
    }

    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
      return {
        authorized: false,
        status: 500,
        error: 'Web Crypto subtle API is unavailable in this runtime.',
      };
    }

    const cryptoKey = await subtle.importKey(
      'jwk',
      matchingJwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['verify']
    );

    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signatureBytes = base64UrlToUint8Array(signatureB64);
    const signatureValid = await subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes as unknown as BufferSource,
      signedData as unknown as BufferSource
    );

    if (!signatureValid) {
      return {
        authorized: false,
        status: 401,
        error: 'Invalid Firebase ID token cryptographic signature.',
      };
    }

    // Check admin authorization: SUPER_ADMIN_EMAILS, extraAdminEmails, or D1 admins table
    if (isEmailInAdminAllowlist(email, options.extraAdminEmails)) {
      return {
        authorized: true,
        status: 200,
        email,
        uid: payload.sub,
      };
    }

    if (options.d1Db) {
      try {
        const row = await options.d1Db
          .prepare('SELECT email FROM admins WHERE LOWER(email) = ?1;')
          .bind(email)
          .first<{ email?: string }>();
        if (row && typeof row.email === 'string' && row.email.trim()) {
          return {
            authorized: true,
            status: 200,
            email,
            uid: payload.sub,
          };
        }
      } catch {
        // Ignore D1 query error if admins table not reachable; fall through to 403
      }
    }

    return {
      authorized: false,
      status: 403,
      error: 'Your account is not authorized for SAMO Admin access.',
    };
  } catch (err) {
    return {
      authorized: false,
      status: 401,
      error:
        err instanceof Error
          ? err.message
          : 'Failed to verify Firebase ID token.',
    };
  }
}

export function validateAndBuildR2UploadObjectKey(input: {
  fileName?: string;
  contentType?: string;
  folder?: string;
}):
  | {
      ok: true;
      mimeType: string;
      isVideo: boolean;
      finalFileName: string;
      objectKey: string;
    }
  | {
      ok: false;
      error: string;
    } {
  const rawContentType =
    typeof input.contentType === 'string'
      ? input.contentType.trim().toLowerCase()
      : '';
  const rawFileName =
    typeof input.fileName === 'string' ? input.fileName.trim() : '';

  if (
    rawContentType.includes('svg') ||
    /\.svgz?$/i.test(rawFileName)
  ) {
    return {
      ok: false,
      error: 'SVG uploads (image/svg+xml) are not allowed.',
    };
  }

  const rawExtMatch = rawFileName ? rawFileName.match(/\.([a-z0-9]+)$/i) : null;
  const rawExt = rawExtMatch ? rawExtMatch[1].toLowerCase() : '';

  let mimeType =
    rawContentType === 'image/jpg' ? 'image/jpeg' : rawContentType;

  if (!mimeType) {
    if (rawExt === 'jpg' || rawExt === 'jpeg') mimeType = 'image/jpeg';
    else if (rawExt === 'png') mimeType = 'image/png';
    else if (rawExt === 'webp') mimeType = 'image/webp';
    else if (rawExt === 'gif') mimeType = 'image/gif';
    else if (rawExt === 'avif') mimeType = 'image/avif';
    else if (rawExt === 'mov') mimeType = 'video/quicktime';
    else if (rawExt === 'webm') mimeType = 'video/webm';
    else if (rawExt === 'mp4' || rawExt === 'hevc' || rawExt === 'm4v')
      mimeType = 'video/mp4';
  } else {
    if (rawExt === 'mov' && mimeType.startsWith('video/')) {
      mimeType = 'video/quicktime';
    } else if (
      (rawExt === 'hevc' || rawExt === 'm4v' || rawExt === 'mp4') &&
      mimeType.startsWith('video/')
    ) {
      mimeType = 'video/mp4';
    } else if (rawExt === 'webm' && mimeType.startsWith('video/')) {
      mimeType = 'video/webm';
    }
  }

  if (!ALLOWED_R2_UPLOAD_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      error: `Unsupported or disallowed media content type: ${
        rawContentType || rawExt || 'unknown'
      }.`,
    };
  }

  const isVideo = mimeType.startsWith('video/');

  const defaultExt = isVideo
    ? rawExt && /^(mp4|webm|mov|hevc|m4v)$/i.test(rawExt)
      ? `.${rawExt}`
      : mimeType === 'video/webm'
      ? '.webm'
      : mimeType === 'video/quicktime'
      ? '.mov'
      : '.mp4'
    : mimeType === 'image/jpeg'
    ? '.jpg'
    : mimeType === 'image/png'
    ? '.png'
    : mimeType === 'image/gif'
    ? '.gif'
    : mimeType === 'image/avif'
    ? '.avif'
    : '.webp';

  const safeBaseName = rawFileName
    ? rawFileName
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    : `samo-item${defaultExt}`;

  const isRecognizedExt =
    /\.(webp|jpg|jpeg|png|gif|avif|mp4|webm|mov|hevc|m4v)$/i.test(safeBaseName);
  const finalFileName = isRecognizedExt
    ? safeBaseName
    : `${safeBaseName.replace(/\.[^/.]+$/, '')}${defaultExt}`;

  const isBannerAsset =
    isVideo ||
    input.folder === 'banners' ||
    finalFileName.startsWith('order-email-banner-');

  const randomId = Math.random().toString(36).slice(2, 8);
  const uniquePrefixName = `${Date.now()}-${randomId}-${finalFileName}`;
  const objectKey = isBannerAsset
    ? `banners/${uniquePrefixName}`
    : `products/${uniquePrefixName}`;

  return {
    ok: true,
    mimeType,
    isVideo,
    finalFileName,
    objectKey,
  };
}
