import { INITIAL_PROMO_CODES } from '../../../src/data/seedCatalog';
import type { OrderItem, PromoCodeItem } from '../../../src/types/samo';
import { hasEmailReachedPromoLimit } from '../../../src/utils/catalogLogic';
import { getCorsHeaders } from '../_auth';
import { readCatalogSnapshot, type Env } from '../catalog';

export interface PromoValidationInput {
  code?: unknown;
  email?: unknown;
}

export interface PromoValidationResult {
  valid: boolean;
  promo?: {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxUsesPerEmail?: number;
    active: true;
    createdAt: string;
  };
  error?: string;
}

export function normalizeStoredPromoItem(raw: any): PromoCodeItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const code = typeof raw.code === 'string' ? raw.code.trim().toUpperCase() : '';
  if (!code) return null;
  const isActive =
    typeof raw.active === 'boolean'
      ? raw.active
      : typeof raw.isActive === 'boolean'
      ? raw.isActive
      : true;
  const rawType =
    typeof raw.discountType === 'string'
      ? raw.discountType.trim().toLowerCase()
      : 'percentage';
  const discountType: 'percentage' | 'fixed' =
    rawType === 'fixed' ? 'fixed' : 'percentage';
  const discountValue = Math.max(0, Number(raw.discountValue) || 0);
  const maxUsesRaw = Math.floor(Number(raw.maxUsesPerEmail) || 0);

  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim()
        : `promo-${code.toLowerCase()}`,
    code,
    discountType,
    discountValue,
    ...(maxUsesRaw > 0 ? { maxUsesPerEmail: maxUsesRaw } : {}),
    active: isActive,
    createdAt:
      typeof raw.createdAt === 'string' && raw.createdAt.trim()
        ? raw.createdAt
        : new Date().toISOString(),
  };
}

export function executePromoValidation(
  input: PromoValidationInput,
  state: Record<string, unknown>
): PromoValidationResult {
  const code =
    typeof input?.code === 'string' ? input.code.trim().toUpperCase() : '';
  if (!code) {
    return {
      valid: false,
      error: 'Please enter a promo code.',
    };
  }

  const rawPromos =
    Array.isArray(state?.promoCodes) && state.promoCodes.length > 0
      ? (state.promoCodes as any[])
      : INITIAL_PROMO_CODES;

  const normalizedPromos = rawPromos
    .map(normalizeStoredPromoItem)
    .filter((p): p is PromoCodeItem => Boolean(p));

  const matched = normalizedPromos.find(
    (p) => p.active && p.code.trim().toUpperCase() === code
  );

  if (!matched || matched.discountValue <= 0) {
    return {
      valid: false,
      error: `Promo code "${code}" is invalid or inactive.`,
    };
  }

  const maxPerEmail = Math.floor(Number(matched.maxUsesPerEmail) || 0);
  if (maxPerEmail > 0) {
    const cleanEmail =
      typeof input?.email === 'string' ? input.email.trim() : '';
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return {
        valid: false,
        error:
          'Please enter your Email Address above to apply this promo code.',
      };
    }

    const orders: OrderItem[] = Array.isArray(state?.orders)
      ? (state.orders as OrderItem[])
      : [];
    if (hasEmailReachedPromoLimit(matched, cleanEmail, orders)) {
      return {
        valid: false,
        error:
          'This promo code has already been used the maximum number of times for this email.',
      };
    }
  }

  return {
    valid: true,
    promo: {
      id: matched.id,
      code: matched.code,
      discountType: matched.discountType,
      discountValue: matched.discountValue,
      ...(maxPerEmail > 0 ? { maxUsesPerEmail: maxPerEmail } : {}),
      active: true,
      createdAt: matched.createdAt || new Date().toISOString(),
    },
  };
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
    const payload = (await context.request.json().catch(() => ({}))) as PromoValidationInput;
    const state = await readCatalogSnapshot(context.env);
    const result = executePromoValidation(payload, state);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        valid: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to validate promo code right now.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};
