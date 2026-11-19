export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
}

export interface Env {
  RESEND_API_KEY?: string;
  DB?: D1DatabaseBinding;
  SAMO_D1?: D1DatabaseBinding;
}

interface OrderEmailPayloadInput {
  order: {
    id?: string;
    orderNumber?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    shippingLocation?: string;
    deliveryMethod?: string;
    paymentMethod?: string;
    deliveryFee?: number;
    subtotal?: number;
    discountAmount?: number;
    promoCode?: string;
    totalPrice?: number;
    itemsSummary?: string;
    primaryProductName?: string;
    primaryProductSize?: string;
    primaryProductImage?: string;
    orderedItems?: Array<{
      productId?: string;
      productName?: string;
      imageUrl?: string;
      selectedColor?: string;
      selectedSize?: string;
      selectedSetSizes?: Array<{
        productName?: string;
        pieceLabel?: string;
        selectedSize?: string;
        selectedColor?: string;
        garmentCode?: string;
      }>;
      garmentCode?: string;
      quantity?: number;
      unitPrice?: number;
    }>;
    createdAt?: string;
  };
  bannerUrl?: string;
  bannerLinkUrl?: string;
  senderAddress?: string;
  bccAddress?: string;
  replyToAddress?: string;
  promoGiftEnabled?: boolean;
  promoGiftCode?: string;
  promoGiftDescription?: string;
  promoGiftBannerUrl?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function escapeHtml(input: unknown): string {
  const str = String(input ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRefCode(raw?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw.trim().replace(/^ref\.?\s*/i, '').trim();
  return cleaned ? `Ref. ${cleaned}` : '';
}

export function buildResendEmailPayload(config: OrderEmailPayloadInput) {
  const { order } = config;
  const orderRef = (order.orderNumber || order.id || 'SAMO-ORDER').trim();
  const customerName = (order.customerName || 'Valued Client').trim();
  const customerEmail = (order.customerEmail || '').trim();
  const customerPhone = (order.customerPhone || '—').trim();
  const shippingLocation = (order.shippingLocation || '—').trim();
  const deliveryMethod = (order.deliveryMethod || 'Standard Delivery').trim();
  const paymentMethod = (order.paymentMethod || 'COD').trim();
  const subtotal = Number(order.subtotal) || 0;
  const discountAmount = Number(order.discountAmount) || 0;
  const promoCode = (order.promoCode || '').trim().toUpperCase();
  const deliveryFee = Number(order.deliveryFee) || 0;
  const totalPrice =
    Number(order.totalPrice) || Math.max(0, subtotal - discountAmount + deliveryFee);

  const rawSender = (config.senderAddress || 'orders@samoweave.com')
    .trim()
    .replace(/^order@samoweave\.com$/i, 'orders@samoweave.com');
  const fromField = rawSender.includes('<') ? rawSender : `SAMO <${rawSender}>`;

  const rawBcc = (
    config.bccAddress !== undefined ? config.bccAddress : 'orders@samoweave.com'
  )
    .trim()
    .replace(/^order@samoweave\.com$/i, 'orders@samoweave.com');
  const bccList = rawBcc
    ? rawBcc
        .split(/[,;]+/)
        .map((e) => e.trim().replace(/^order@samoweave\.com$/i, 'orders@samoweave.com'))
        .filter((e) => e.includes('@'))
    : [];

  const replyTo = (config.replyToAddress || 'info@samoweave.com').trim();
  const bannerUrl = (config.bannerUrl || '').trim();
  const hasPublicBanner =
    bannerUrl.startsWith('https://') || bannerUrl.startsWith('http://');
  const rawBannerLink = (
    config.bannerLinkUrl || 'https://samoweave.com/new-arrivals/women'
  ).trim();
  const bannerTargetLink = rawBannerLink.includes('utm_source=')
    ? rawBannerLink
    : `${rawBannerLink}${rawBannerLink.includes('?') ? '&' : '?'}utm_source=order_email&utm_medium=email`;

  const promoGiftEnabled = Boolean(config.promoGiftEnabled);
  const promoGiftCode = (config.promoGiftCode ?? 'SAMO10').trim().toUpperCase();
  const promoGiftDescription = (
    config.promoGiftDescription !== undefined
      ? config.promoGiftDescription
      : 'Enjoy 10% off your next order'
  )
    .trim()
    .replace(/\s+at\s+samoweave\.com\.?$/i, '')
    .trim();
  const promoGiftBannerUrl = (config.promoGiftBannerUrl || '').trim();
  const hasPublicPromoBanner =
    promoGiftBannerUrl.startsWith('https://') ||
    promoGiftBannerUrl.startsWith('http://');
  const showPromoGiftSection = promoGiftEnabled && Boolean(promoGiftCode);

  const formattedDate = (() => {
    try {
      const d = order.createdAt ? new Date(order.createdAt) : new Date();
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  })();

  const isShowroomPickup = deliveryMethod
    .toLowerCase()
    .includes('showroom pickup');

  const orderedItems = Array.isArray(order.orderedItems)
    ? order.orderedItems
    : [];

  let itemsHtmlRows = '';
  const itemsTextLines: string[] = [];

  if (orderedItems.length > 0) {
    orderedItems.forEach((item, index) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const name = (item.productName || `SAMO Garment #${index + 1}`).trim();
      const refCode = item.garmentCode ? formatRefCode(item.garmentCode) : '';
      const color = (item.selectedColor || '').trim();
      const size = (item.selectedSize || 'OS').trim();
      const setPieces = Array.isArray(item.selectedSetSizes)
        ? item.selectedSetSizes
        : [];
      const unitPrice =
        typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
          ? item.unitPrice
          : orderedItems.length === 1
          ? Math.round(subtotal / qty)
          : undefined;
      const lineTotal =
        unitPrice !== undefined ? `$${(unitPrice * qty).toLocaleString()}` : '';

      const rawItemImg = (
        item.imageUrl ||
        (orderedItems.length === 1 ? order.primaryProductImage : '') ||
        ''
      ).trim();
      const hasPublicItemImage =
        rawItemImg.startsWith('https://') || rawItemImg.startsWith('http://');

      const metaParts: string[] = [];
      if (refCode) metaParts.push(refCode);
      if (color) metaParts.push(`Color: ${color}`);
      if (setPieces.length > 0) {
        const pieceDesc = setPieces
          .map((sp) => {
            const pName = sp.pieceLabel || sp.productName || 'Piece';
            const pColor = sp.selectedColor ? `${sp.selectedColor} · ` : '';
            const pSize = sp.selectedSize || 'OS';
            return `${pName}: ${pColor}Size ${pSize}`;
          })
          .join(' | ');
        metaParts.push(pieceDesc);
      } else if (size) {
        metaParts.push(`Size: ${size === 'OS' ? 'One Size' : size}`);
      }

      const metaLine = metaParts.join(' · ');

      itemsHtmlRows += `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #E5E5E5;vertical-align:top;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                ${
                  hasPublicItemImage
                    ? `<td width="56" style="width:56px;padding-right:12px;vertical-align:top;">
                        <img
                          src="${escapeHtml(rawItemImg)}"
                          alt="${escapeHtml(name)}"
                          width="56"
                          height="70"
                          style="display:block;width:56px;height:70px;object-fit:cover;border:1px solid #E4E4E7;background-color:#F4F4F5;"
                        />
                      </td>`
                    : ''
                }
                <td style="vertical-align:top;">
                  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#09090B;line-height:1.4;">
                    ${escapeHtml(name)}
                  </div>
                  ${
                    metaLine
                      ? `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;color:#52525B;letter-spacing:0.04em;margin-top:4px;line-height:1.5;">
                          ${escapeHtml(metaLine)}
                        </div>`
                      : ''
                  }
                </td>
              </tr>
            </table>
          </td>
          <td align="center" style="padding:14px 8px;border-bottom:1px solid #E5E5E5;vertical-align:top;font-family:'Courier New',Courier,monospace;font-size:12px;color:#27272A;white-space:nowrap;">
            Qty: ${qty}
          </td>
          <td align="right" style="padding:14px 0;border-bottom:1px solid #E5E5E5;vertical-align:top;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#09090B;white-space:nowrap;">
            ${lineTotal ? escapeHtml(lineTotal) : 'Included'}
          </td>
        </tr>`;

      itemsTextLines.push(
        `- ${qty}x ${name}${metaLine ? ` (${metaLine})` : ''}${
          lineTotal ? ` — ${lineTotal}` : ''
        }`
      );
    });
  } else {
    const fallbackSummary = (
      order.itemsSummary ||
      `${order.primaryProductName || 'SAMO Order'} (${order.primaryProductSize || 'Standard'})`
    )
      .replace(/\s*\[Payment:[^\]]+\]\s*$/i, '')
      .trim();

    itemsHtmlRows = `
      <tr>
        <td colspan="3" style="padding:14px 0;border-bottom:1px solid #E5E5E5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:#09090B;line-height:1.6;">
          ${escapeHtml(fallbackSummary)}
        </td>
      </tr>`;
    itemsTextLines.push(`- ${fallbackSummary}`);
  }

  const deliveryFeeText = isShowroomPickup
    ? 'Showroom Pickup — Complimentary'
    : deliveryFee <= 0
    ? 'Complimentary'
    : `$${deliveryFee.toLocaleString()}`;

  const preheaderText = `Your SAMO order #${orderRef} is confirmed. View your itemized receipt and delivery details.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Order Confirmed — SAMO (#${escapeHtml(orderRef)})</title>
</head>
<body style="margin:0;padding:0;background-color:#EFEFEF;color:#09090B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:#EFEFEF;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${escapeHtml(preheaderText)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EFEFEF;width:100%;margin:0;padding:20px 0;">
    <tr>
      <td align="center" style="padding:0 10px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #09090B;border-collapse:collapse;">
          
          <tr>
            <td align="center" style="background-color:#FFFFFF;padding:26px 24px 22px 24px;border-bottom:1px solid #09090B;text-align:center;">
              <a href="https://samoweave.com/home?utm_source=order_email&utm_medium=email" target="_blank" style="text-decoration:none;display:inline-block;">
                <img
                  src="https://images.samoweave.com/logo/samo-weave-logo.png"
                  alt="SAMO"
                  width="150"
                  style="display:block;margin:0 auto;width:150px;max-width:170px;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 20px 24px;background-color:#FFFFFF;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#71717A;margin-bottom:8px;">
                ORDER CONFIRMATION · EST. 1999
              </div>
              <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#09090B;line-height:1.25;">
                THANK YOU FOR YOUR ORDER, ${escapeHtml(customerName)}
              </h1>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#3F3F46;">
                We have received your SAMO order <strong style="color:#09090B;">#${escapeHtml(orderRef)}</strong>. Our studio is preparing your garments for ${
    isShowroomPickup
      ? 'pickup at the SAMO Flagship Showroom'
      : 'dispatch to your delivery address'
  }.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 22px 24px;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#F4F4F5;border:1px solid #E4E4E7;border-collapse:collapse;">
                <tr>
                  <td width="50%" style="padding:12px 14px;border-bottom:1px solid #E4E4E7;border-right:1px solid #E4E4E7;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">ORDER NUMBER</div>
                    <div style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#09090B;margin-top:4px;">#${escapeHtml(orderRef)}</div>
                  </td>
                  <td width="50%" style="padding:12px 14px;border-bottom:1px solid #E4E4E7;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">ORDER DATE</div>
                    <div style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#09090B;margin-top:4px;">${escapeHtml(formattedDate)}</div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:12px 14px;border-right:1px solid #E4E4E7;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">FULFILLMENT</div>
                    <div style="font-size:12px;font-weight:700;color:#09090B;margin-top:4px;">${escapeHtml(deliveryMethod)}</div>
                  </td>
                  <td width="50%" style="padding:12px 14px;vertical-align:top;">
                    <div style="font-size:9px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#71717A;">PAYMENT METHOD</div>
                    <div style="font-size:12px;font-weight:700;color:#09090B;margin-top:4px;">${escapeHtml(paymentMethod)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 20px 24px;background-color:#FFFFFF;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#09090B;padding-bottom:8px;border-bottom:2px solid #09090B;">
                ITEMIZED RECEIPT
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                ${itemsHtmlRows}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:14px;border-collapse:collapse;">
                <tr>
                  <td style="padding:5px 0;font-size:12px;color:#52525B;">Subtotal</td>
                  <td align="right" style="padding:5px 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#09090B;">$${subtotal.toLocaleString()}</td>
                </tr>
                ${
                  discountAmount > 0
                    ? `<tr>
                        <td style="padding:5px 0;font-size:12px;color:#4A080C;font-weight:700;">Privilege Discount${
                          promoCode ? ` (${escapeHtml(promoCode)})` : ''
                        }</td>
                        <td align="right" style="padding:5px 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#4A080C;font-weight:700;">-$${discountAmount.toLocaleString()}</td>
                      </tr>`
                    : ''
                }
                <tr>
                  <td style="padding:5px 0;font-size:12px;color:#52525B;">Delivery</td>
                  <td align="right" style="padding:5px 0;font-family:'Courier New',Courier,monospace;font-size:12px;color:#09090B;">${escapeHtml(deliveryFeeText)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0 4px 0;border-top:1px solid #09090B;font-size:13px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#09090B;">TOTAL (USD)</td>
                  <td align="right" style="padding:12px 0 4px 0;border-top:1px solid #09090B;font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:800;color:#09090B;">$${totalPrice.toLocaleString()}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 28px 24px;background-color:#FFFFFF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#FAFAFA;border:1px solid #E5E5E5;border-collapse:collapse;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#09090B;margin-bottom:8px;">
                      CLIENT &amp; ${isShowroomPickup ? 'SHOWROOM PICKUP' : 'DELIVERY'} DETAILS
                    </div>
                    <div style="font-size:12px;line-height:1.6;color:#27272A;">
                      <strong>Client:</strong> ${escapeHtml(customerName)}<br />
                      <strong>Phone:</strong> ${escapeHtml(customerPhone)}<br />
                      ${
                        customerEmail
                          ? `<strong>Email:</strong> ${escapeHtml(customerEmail)}<br />`
                          : ''
                      }
                      <strong>${isShowroomPickup ? 'Pickup Location / Notes' : 'Delivery Address'}:</strong> ${escapeHtml(shippingLocation)}
                    </div>
                    ${
                      isShowroomPickup
                        ? `<div style="margin-top:10px;font-size:11px;line-height:1.5;color:#3F3F46;">
                            Your order will be reserved at the <strong>SAMO Flagship Showroom</strong>. <a href="https://samoweave.com/showroom?utm_source=order_email&utm_medium=email" target="_blank" style="color:#09090B;font-weight:700;text-decoration:underline;">View Showroom Hours &amp; Map</a>
                          </div>`
                        : ''
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${
            showPromoGiftSection
              ? hasPublicPromoBanner
                ? `<tr>
            <td style="padding:0;background-color:#FFFFFF;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-top:1px solid #09090B;border-bottom:1px solid #09090B;border-left:0;border-right:0;border-collapse:collapse;">
                <tr>
                  <td
                    width="600"
                    align="center"
                    background="${escapeHtml(promoGiftBannerUrl)}"
                    bgcolor="#18181B"
                    style="width:100%;max-width:600px;background-image:url('${escapeHtml(promoGiftBannerUrl)}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:#18181B;padding:0;text-align:center;"
                  >
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:rgba(9,9,11,0.46);">
                      <tr>
                        <td align="center" style="padding:26px 20px;text-align:center;">
                          <div style="font-size:15px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#FFFFFF;margin-bottom:${
                            promoGiftDescription ? '8px' : '16px'
                          };">
                            YOU GOT 10% OFF
                          </div>
                          ${
                            promoGiftDescription
                              ? `<div style="font-size:12px;line-height:1.5;color:#F4F4F5;margin-bottom:16px;">
                                  ${escapeHtml(promoGiftDescription)}
                                </div>`
                              : ''
                          }
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:collapse;">
                            <tr>
                              <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px dashed #FFFFFF;padding:10px 24px;">
                                <span style="font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:800;letter-spacing:0.22em;color:#09090B;">
                                  ${escapeHtml(promoGiftCode)}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
                : `<tr>
            <td style="padding:0;background-color:#FFFFFF;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FAF9F7;border-top:1px solid #09090B;border-bottom:1px solid #09090B;border-left:0;border-right:0;border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:22px 18px;text-align:center;">
                    <div style="font-size:15px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#09090B;margin-bottom:${
                      promoGiftDescription ? '6px' : '14px'
                    };">
                      YOU GOT 10% OFF
                    </div>
                    ${
                      promoGiftDescription
                        ? `<div style="font-size:12px;line-height:1.5;color:#3F3F46;margin-bottom:14px;">
                            ${escapeHtml(promoGiftDescription)}
                          </div>`
                        : ''
                    }
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px dashed #09090B;padding:10px 22px;">
                          <span style="font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:800;letter-spacing:0.22em;color:#09090B;">
                            ${escapeHtml(promoGiftCode)}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ''
          }

          <tr>
            <td style="padding:0;border-top:1px solid #E5E5E5;background-color:#FFFFFF;">
              ${
                hasPublicBanner
                  ? `<a href="${escapeHtml(bannerTargetLink)}" target="_blank" style="display:block;text-decoration:none;border:0;">
                      <img
                        src="${escapeHtml(bannerUrl)}"
                        alt="SAMO Editorial Campaign"
                        width="600"
                        style="width:100%;max-width:600px;height:auto;display:block;border:0;outline:none;text-decoration:none;"
                      />
                    </a>`
                  : ''
              }
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background-color:#FFFFFF;">
                <tr>
                  <td align="center" style="padding:22px 24px 26px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;margin-bottom:10px;">
                      <tr>
                        <td align="center" bgcolor="#09090B" style="background-color:#09090B;border:1px solid #09090B;">
                          <a
                            href="${escapeHtml(bannerTargetLink)}"
                            target="_blank"
                            style="display:block;padding:14px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;text-align:center;"
                          >
                            EXPLORE NEW ARRIVALS
                          </a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                      <tr>
                        <td align="center" bgcolor="#FFFFFF" style="background-color:#FFFFFF;border:1px solid #09090B;">
                          <a
                            href="https://api.whatsapp.com/send/?phone=96170224767&amp;text&amp;type=phone_number&amp;app_absent=0"
                            target="_blank"
                            style="display:block;padding:13px 20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#09090B;text-decoration:none;text-align:center;"
                          >
                            CONTACT US
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="background-color:#D4D4D4;padding:20px 24px;border-top:1px solid #09090B;text-align:center;">
              <div style="font-size:11px;line-height:1.6;color:#27272A;margin-bottom:8px;">
                Questions about your order? Contact our Client Concierge:
                <a href="mailto:support@samoweave.com" style="color:#09090B;font-weight:700;text-decoration:underline;">support@samoweave.com</a>
              </div>
              <div style="font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#09090B;">
                &copy; 2026 SAMO (EST. 1999) &mdash; ALL RIGHTS RESERVED
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `SAMO — ORDER CONFIRMED (#${orderRef})`,
    `==================================================`,
    `Thank you for your order, ${customerName}.`,
    ``,
    `Order Number: #${orderRef}`,
    `Order Date: ${formattedDate}`,
    `Fulfillment: ${deliveryMethod}`,
    `Payment Method: ${paymentMethod}`,
    ``,
    `ITEMIZED RECEIPT`,
    `--------------------------------------------------`,
    ...itemsTextLines,
    `--------------------------------------------------`,
    `Subtotal: $${subtotal.toLocaleString()}`,
    ...(discountAmount > 0
      ? [
          `Privilege Discount${promoCode ? ` (${promoCode})` : ''}: -$${discountAmount.toLocaleString()}`,
        ]
      : []),
    `Delivery: ${deliveryFeeText}`,
    `TOTAL (USD): $${totalPrice.toLocaleString()}`,
    ``,
    `CLIENT & DELIVERY DETAILS`,
    `--------------------------------------------------`,
    `Client: ${customerName}`,
    `Phone: ${customerPhone}`,
    ...(customerEmail ? [`Email: ${customerEmail}`] : []),
    `Address / Location: ${shippingLocation}`,
    ...(showPromoGiftSection
      ? [
          ``,
          `YOU GOT 10% OFF`,
          `--------------------------------------------------`,
          ...(promoGiftDescription ? [`${promoGiftDescription}`] : []),
          `Promo Code: ${promoGiftCode}`,
        ]
      : []),
    ``,
    `Explore New Arrivals: ${bannerTargetLink}`,
    `Contact Us: https://api.whatsapp.com/send/?phone=96170224767&text&type=phone_number&app_absent=0`,
    ``,
    `Questions about your order? Contact our Client Concierge: support@samoweave.com`,
    `© 2026 SAMO (EST. 1999) — ALL RIGHTS RESERVED`,
  ].join('\n');

  const hasValidCustomerEmail = customerEmail.includes('@');
  const primaryRecipient = hasValidCustomerEmail
    ? customerEmail
    : bccList[0] || 'orders@samoweave.com';
  const effectiveBccList = hasValidCustomerEmail
    ? bccList.filter(
        (e) => e.toLowerCase() !== primaryRecipient.toLowerCase()
      )
    : bccList.slice(1);

  const payload: {
    from: string;
    to: string[];
    bcc?: string[];
    reply_to?: string;
    subject: string;
    html: string;
    text: string;
  } = {
    from: fromField,
    to: [primaryRecipient],
    subject: `Order Confirmed — SAMO (#${orderRef})`,
    html,
    text,
  };

  if (effectiveBccList.length > 0) {
    payload.bcc = effectiveBccList;
  }
  if (replyTo) {
    payload.reply_to = replyTo;
  }

  return payload;
}

export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

export const onRequestPost = async (context: {
  request: Request;
  env: Env;
  waitUntil?: (promise: Promise<unknown>) => void;
}): Promise<Response> => {
  try {
    const apiKey = (context.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          error:
            'RESEND_API_KEY is not configured in Cloudflare environment secrets.',
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const body = (await context.request.json()) as {
      order?: OrderEmailPayloadInput['order'];
      bannerUrl?: string;
      bannerLinkUrl?: string;
      senderAddress?: string;
      bccAddress?: string;
      replyToAddress?: string;
      promoGiftEnabled?: boolean;
      promoGiftCode?: string;
      promoGiftDescription?: string;
      promoGiftBannerUrl?: string;
    };

    const order = body?.order;
    if (!order || typeof order !== 'object') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing order payload.' }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    let storedBanners: Record<string, any> = {};
    const db = context.env.DB || context.env.SAMO_D1;
    if (db) {
      try {
        const row = await db
          .prepare('SELECT value FROM settings WHERE key = ?1;')
          .bind('siteBanners')
          .first<{ value?: string }>();
        if (row?.value) {
          const parsed = JSON.parse(row.value);
          if (parsed && typeof parsed === 'object') {
            storedBanners = parsed;
          }
        }
      } catch (d1Err) {
        console.warn('[SAMO] D1 siteBanners lookup notice:', d1Err);
      }

      // Enrich orderedItems with product/color variant images from D1 if any item lacks imageUrl
      if (
        Array.isArray(order.orderedItems) &&
        order.orderedItems.some((item) => !item.imageUrl)
      ) {
        for (const item of order.orderedItems) {
          if (item.imageUrl || !item.productId) continue;
          try {
            const prodRow = await db
              .prepare(
                'SELECT image_url, color_variants FROM products WHERE id = ?1;'
              )
              .bind(item.productId)
              .first<{ image_url?: string; color_variants?: string }>();
            if (prodRow) {
              let resolvedImg = prodRow.image_url || '';
              if (item.selectedColor && prodRow.color_variants) {
                try {
                  const variants = JSON.parse(prodRow.color_variants) as Array<{
                    colorName?: string;
                    imageUrl?: string;
                  }>;
                  const matchedVar = variants.find(
                    (v) =>
                      (v.colorName || '').trim().toLowerCase() ===
                      item.selectedColor!.trim().toLowerCase()
                  );
                  if (matchedVar?.imageUrl) {
                    resolvedImg = matchedVar.imageUrl;
                  }
                } catch {}
              }
              if (resolvedImg) {
                item.imageUrl = resolvedImg;
              }
            }
          } catch {}
        }
      }
    }

    const emailPayload = buildResendEmailPayload({
      order,
      bannerUrl:
        body.bannerUrl && body.bannerUrl.trim()
          ? body.bannerUrl.trim()
          : storedBanners.orderEmailBannerUrl || '',
      bannerLinkUrl:
        body.bannerLinkUrl ||
        storedBanners.orderEmailBannerLinkUrl ||
        'https://samoweave.com/new-arrivals/women',
      senderAddress:
        body.senderAddress ||
        storedBanners.orderEmailSenderAddress ||
        'orders@samoweave.com',
      bccAddress:
        body.bccAddress !== undefined
          ? body.bccAddress
          : storedBanners.orderEmailBccAddress !== undefined
          ? storedBanners.orderEmailBccAddress
          : 'orders@samoweave.com',
      replyToAddress:
        body.replyToAddress ||
        storedBanners.orderEmailReplyToAddress ||
        'info@samoweave.com',
      promoGiftEnabled:
        typeof body.promoGiftEnabled === 'boolean'
          ? body.promoGiftEnabled
          : Boolean(storedBanners.orderEmailPromoEnabled),
      promoGiftCode:
        body.promoGiftCode !== undefined
          ? body.promoGiftCode
          : storedBanners.orderEmailPromoCode || 'SAMO10',
      promoGiftDescription:
        body.promoGiftDescription !== undefined
          ? String(body.promoGiftDescription)
          : storedBanners.orderEmailPromoDescription !== undefined
          ? String(storedBanners.orderEmailPromoDescription)
          : 'Enjoy 10% off your next order',
      promoGiftBannerUrl:
        body.promoGiftBannerUrl !== undefined
          ? String(body.promoGiftBannerUrl).trim()
          : storedBanners.orderEmailPromoBannerUrl || '',
    });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = (await resendResponse.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!resendResponse.ok) {
      const errMsg =
        resendData?.message ||
        `Resend API returned HTTP ${resendResponse.status}`;
      console.warn('[SAMO] Resend API error:', errMsg);
      return new Response(
        JSON.stringify({
          ok: false,
          error: errMsg,
          status: resendResponse.status,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        id: resendData.id || null,
        to: emailPayload.to,
        bcc: emailPayload.bcc || [],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unexpected error sending order confirmation email.';
    console.warn('[SAMO] Order email handler error:', message);
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
};
