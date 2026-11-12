import React, { useState } from 'react';
import { Plus, Minus, Ruler } from 'lucide-react';
import { SizeGuideConfig, SizeGuideId, SizeGuideTable } from '../types/samo';
import { DEFAULT_SIZE_GUIDE_CONFIG } from '../utils/sizeGuideLogic';

interface FaqEntry {
  id: string;
  question: string;
  paragraphs?: string[];
  sizeGuideId?: SizeGuideId;
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'refund-policy',
    question: 'Refund Policy',
    paragraphs: [
      'Clients have 24 hours after purchase or after receiving the product to request a refund. Full refunds are also covered if the garment has a manufacturing defect from the enterprise. The original SAMO price tag must remain attached to the item at all times to qualify for a refund.',
    ],
  },
  {
    id: 'return-policy',
    question: 'Return Policy',
    paragraphs: [
      'Items can be returned within 7 days after receiving your order. The original price tag must stay attached on the item throughout these 7 days.',
    ],
  },
  {
    id: 'shipping-policy',
    question: 'Shipping Policy',
    paragraphs: [
      'All orders are processed and delivered within 3 to 5 days after ordering.',
    ],
  },
  {
    id: 'in-store-reservations',
    question: 'In-store reservations',
    paragraphs: [
      'When you reserve an item on the website (SAMO Showroom Pickup), your garment is held for 24 hours (1 day) after reserving online. Within this 24-hour window, you may visit our store, try the item in store, and complete your checkout.',
    ],
  },
  {
    id: 'tops-jackets-coats-size-guide',
    question: 'Tops, Jackets, Coats Size Guide',
    sizeGuideId: 'tops_guide',
  },
  {
    id: 'trousers-and-denim-size-guide',
    question: 'Trousers and Denim Size Guide',
    sizeGuideId: 'trousers_guide',
  },
];

interface FaqSectionProps {
  sizeGuideConfig?: SizeGuideConfig;
}

export const FaqSection: React.FC<FaqSectionProps> = ({
  sizeGuideConfig = DEFAULT_SIZE_GUIDE_CONFIG,
}) => {
  // All questions start closed until the user clicks to open one
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const renderSizeGuideBox = (guideId: SizeGuideId) => {
    const table: SizeGuideTable | undefined = sizeGuideConfig.tables[guideId];
    if (!table) return null;

    return (
      <div
        data-testid={`faq-size-guide-box-${guideId}`}
        className="bg-white border border-[#1A1A1A] p-4 sm:p-5 space-y-4 mt-1 text-zinc-950"
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-[#1A1A1A] shrink-0" />
            <div>
              <div className="text-xs sm:text-[13px] font-bold uppercase tracking-[0.12em] text-[#1A1A1A]">
                {table.title}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono-tabular">
                Centimeters (cm) · Samo Standard Fit
              </div>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono-tabular">
            Swipe horizontally on mobile →
          </span>
        </div>

        {/* Scrollable Measurement Table with Sticky First Column */}
        <div className="border border-[#E5E5E5] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[540px]">
            <thead>
              <tr className="bg-[#F8F7F5] border-b border-[#E5E5E5]">
                {table.columns.map((col, cIdx) => (
                  <th
                    key={cIdx}
                    scope="col"
                    className={`py-2.5 px-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-900 border-r last:border-r-0 border-[#E5E5E5] whitespace-nowrap text-center ${
                      cIdx === 0
                        ? 'sticky left-0 bg-[#F8F7F5] z-20 shadow-[1px_0_0_0_#E5E5E5]'
                        : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] bg-white">
              {table.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-50/80 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-2.5 px-3 text-[11px] sm:text-xs font-mono-tabular text-zinc-800 border-r last:border-r-0 border-[#E5E5E5] whitespace-nowrap text-center ${
                        cIdx === 0
                          ? 'sticky left-0 bg-white font-bold text-zinc-950 z-10 shadow-[1px_0_0_0_#E5E5E5]'
                          : ''
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Samo Fit Note Box */}
        {sizeGuideConfig.fitNoteEnabled && sizeGuideConfig.fitNoteText && (
          <div className="border border-[#1A1A1A] p-3.5 sm:p-4 bg-[#FBFBFA] space-y-1.5">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-[#1A1A1A] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-[#4A080C] shrink-0" />
              <span>{sizeGuideConfig.fitNoteTitle || 'SAMO FIT NOTE'}</span>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed">
              {sizeGuideConfig.fitNoteText}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      id="samo-faq-section"
      data-testid="faq-section"
      aria-labelledby="samo-faq-heading"
      className="bg-white text-zinc-950 border-t border-zinc-200 py-12 sm:py-16 px-4 sm:px-6 lg:px-10"
    >
      <div className="max-w-2xl mx-auto">
        {/* Heading & Italic Serif Subtitle */}
        <div className="text-center space-y-2 mb-8 sm:mb-9">
          <h2
            id="samo-faq-heading"
            className="font-display text-xl sm:text-2xl font-bold uppercase tracking-[0.02em] text-zinc-950"
          >
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="font-serif italic text-base sm:text-lg text-zinc-800">
            Everything you need to know about our services and policies.
          </p>
        </div>

        {/* Soft Ivory Rounded FAQ Containers */}
        <div className="space-y-3.5">
          {FAQ_ENTRIES.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                data-testid={`faq-item-${item.id}`}
                className="bg-[#F4F2EC] rounded-[14px] border border-[#EAE6DD] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  className="w-full px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold uppercase tracking-[0.02em] text-zinc-950">
                    {item.question}
                  </span>
                  {isOpen ? (
                    <Minus
                      strokeWidth={1.5}
                      className="w-5 h-5 text-[#6E6A63] shrink-0"
                    />
                  ) : (
                    <Plus
                      strokeWidth={1.5}
                      className="w-5 h-5 text-[#6E6A63] shrink-0"
                    />
                  )}
                </button>

                {isOpen && (
                  <div
                    data-testid={`faq-content-${item.id}`}
                    className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0.5 text-[14px] sm:text-[15px] text-zinc-900 leading-relaxed"
                  >
                    {item.paragraphs && item.paragraphs.length > 0 && (
                      <div className="space-y-2">
                        {item.paragraphs.map((line, pIdx) => (
                          <p key={pIdx} className="leading-relaxed">
                            {line}
                          </p>
                        ))}
                      </div>
                    )}

                    {item.sizeGuideId && renderSizeGuideBox(item.sizeGuideId)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Contact Us Link to WhatsApp 70 224 767 */}
        <div className="mt-9 sm:mt-10 text-center">
          <a
            href="https://wa.me/96170224767"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="faq-whatsapp-contact-link"
            aria-label="Still have questions? Contact us on WhatsApp at 70 224 767"
            className="inline-flex items-center justify-center font-serif italic text-base sm:text-lg tracking-[0.03em] text-zinc-950 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <span className="underline underline-offset-4">
              STILL HAVE QUESTIONS?
            </span>
            <span className="mx-1.5 no-underline">/</span>
            <span className="underline underline-offset-4">CONTACT US →</span>
          </a>
        </div>
      </div>
    </section>
  );
};
