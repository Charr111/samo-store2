import type { Department, PreorderItem } from '../../src/types/samo';
import { getCorsHeaders } from './_auth';
import { applyCatalogPatch, readCatalogSnapshot, type Env } from './catalog';

export interface CreatePreorderInput {
  productId?: unknown;
  productName?: unknown;
  productImage?: unknown;
  department?: unknown;
  category?: unknown;
  selectedSize?: unknown;
  selectedColor?: unknown;
  customerContact?: unknown;
}

export interface CreatePreorderAdapter {
  readState: () => Promise<Record<string, unknown>>;
  writeState: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

export async function executeCreatePreorder(
  input: CreatePreorderInput,
  adapter: CreatePreorderAdapter
): Promise<{ status: number; body: Record<string, unknown> }> {
  const productId =
    typeof input?.productId === 'string' ? input.productId.trim().slice(0, 120) : '';
  const productName =
    typeof input?.productName === 'string'
      ? input.productName.trim().slice(0, 180)
      : '';
  const selectedSize =
    typeof input?.selectedSize === 'string'
      ? input.selectedSize.trim().slice(0, 60)
      : '';
  const customerContact =
    typeof input?.customerContact === 'string'
      ? input.customerContact.trim().slice(0, 180)
      : '';

  if (!productId || !productName || !selectedSize || !customerContact) {
    return {
      status: 400,
      body: {
        ok: false,
        error:
          'Missing required preorder fields (productId, productName, selectedSize, customerContact).',
      },
    };
  }

  const productImage =
    typeof input?.productImage === 'string'
      ? input.productImage.trim().slice(0, 600)
      : '';
  const department: Department =
    input?.department === 'kids' ? 'kids' : 'women';
  const category =
    typeof input?.category === 'string'
      ? input.category.trim().slice(0, 100)
      : 'Tops';
  const selectedColor =
    typeof input?.selectedColor === 'string' && input.selectedColor.trim()
      ? input.selectedColor.trim().slice(0, 80)
      : undefined;

  const newPreorder: PreorderItem = {
    id: `pre-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId,
    productName,
    productImage,
    department,
    category,
    selectedSize,
    ...(selectedColor ? { selectedColor } : {}),
    customerContact,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const currentState = await adapter.readState();
  const existingPreorders: PreorderItem[] = Array.isArray(currentState.preorders)
    ? (currentState.preorders as PreorderItem[]).filter((p) =>
        Boolean(p && p.productName)
      )
    : [];

  const nextPreorders = [newPreorder, ...existingPreorders];
  await adapter.writeState({ preorders: nextPreorders });

  return {
    status: 200,
    body: {
      ok: true,
      preorder: newPreorder,
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
    const payload = (await context.request
      .json()
      .catch(() => ({}))) as CreatePreorderInput;

    const result = await executeCreatePreorder(payload, {
      readState: () => readCatalogSnapshot(context.env),
      writeState: (patch) => applyCatalogPatch(context.env, patch),
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to submit preorder request.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};
