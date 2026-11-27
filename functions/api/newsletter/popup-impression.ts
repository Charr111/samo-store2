import {
  NEWSLETTER_CORS_HEADERS,
  resolveWorkerClientIp,
  workerPopupImpressionsMemory,
} from './_memory';

export const onRequestOptions = async () => {
  return new Response(null, { status: 204, headers: NEWSLETTER_CORS_HEADERS });
};

export const onRequestPost = async (context: { request: Request }) => {
  try {
    const clientIp = resolveWorkerClientIp(context.request);
    const today = new Date().toISOString().slice(0, 10);

    // Prune stale dates so the in-memory map stays compact
    for (const [ipKey, rec] of Object.entries(workerPopupImpressionsMemory)) {
      if (!rec || rec.date !== today) {
        delete workerPopupImpressionsMemory[ipKey];
      }
    }

    const prev = workerPopupImpressionsMemory[clientIp];
    const nextCount = prev && prev.date === today ? prev.count + 1 : 1;
    workerPopupImpressionsMemory[clientIp] = { date: today, count: nextCount };

    return new Response(
      JSON.stringify({
        ip: clientIp,
        date: today,
        countToday: nextCount,
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
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        ...NEWSLETTER_CORS_HEADERS,
        'Content-Type': 'application/json',
      },
    });
  }
};
