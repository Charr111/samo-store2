export const NEWSLETTER_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

// Kept strictly in Cloudflare Worker isolate memory:
// 0 D1 SQL reads and 0 D1 SQL rows_written for popup eligibility & impression tracking.
export const workerPopupImpressionsMemory: Record<
  string,
  { date: string; count: number }
> = {};

export const workerSubscribedNewsletterIpsMemory = new Set<string>();

export function resolveWorkerClientIp(request: Request): string {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }
  const xff = request.headers.get('X-Forwarded-For');
  if (xff && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return '127.0.0.1';
}

export function hasWorkerSubscribedCookie(request: Request): boolean {
  const rawCookie = request.headers.get('Cookie');
  if (!rawCookie || !rawCookie.trim()) return false;
  return rawCookie
    .split(';')
    .some((part) => part.trim() === 'samo_nl_subscribed=1');
}
