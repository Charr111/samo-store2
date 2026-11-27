import {
  hasWorkerSubscribedCookie,
  NEWSLETTER_CORS_HEADERS,
  resolveWorkerClientIp,
  workerPopupImpressionsMemory,
  workerSubscribedNewsletterIpsMemory,
} from './_memory';

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: NEWSLETTER_CORS_HEADERS });
};

export const onRequestGet = async (context: { request: Request }) => {
  try {
    const clientIp = resolveWorkerClientIp(context.request);
    const today = new Date().toISOString().slice(0, 10);
    const url = new URL(context.request.url);
    const maxPerDay = Math.max(
      1,
      Math.floor(Number(url.searchParams.get('maxPerDay')) || 2)
    );

    const entry = workerPopupImpressionsMemory[clientIp];
    const countToday = entry && entry.date === today ? entry.count : 0;
    const isAlreadySubscribed =
      workerSubscribedNewsletterIpsMemory.has(clientIp) ||
      hasWorkerSubscribedCookie(context.request);

    return new Response(
      JSON.stringify({
        ip: clientIp,
        date: today,
        countToday,
        maxPerDay,
        subscribed: isAlreadySubscribed,
        eligible: !isAlreadySubscribed && countToday < maxPerDay,
      }),
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
      JSON.stringify({ eligible: true, countToday: 0, subscribed: false }),
      {
        status: 200,
        headers: {
          ...NEWSLETTER_CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
