import { getCorsHeaders } from '../_auth';
import {
  hasWorkerSubscribedCookie,
  resolveWorkerClientIp,
  workerPopupImpressionsMemory,
  workerSubscribedNewsletterIpsMemory,
} from './_memory';

export const onRequestOptions = async (context: { request?: Request }) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context?.request),
  });
};

export const onRequestGet = async (context: { request: Request }) => {
  const corsHeaders = getCorsHeaders(context.request);
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
          ...corsHeaders,
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
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
