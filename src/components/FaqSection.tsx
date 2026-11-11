import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqEntry {
  id: string;
  question: string;
  bullets: string[];
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'refund-policy',
    question: 'Refund Policy',
    bullets: [
      'Clients have 24 hours after purchase or after receiving the product to request a refund.',
      'Full refunds are also covered if the garment has a manufacturing defect from the enterprise.',
      'The original SAMO price tag must remain attached to the item at all times to qualify for a refund.',
    ],
  },
  {
    id: 'return-policy',
    question: 'Return Policy',
    bullets: [
      'Items can be returned within 7 days after receiving your order.',
      'The original price tag must stay attached on the item throughout these 7 days.',
    ],
  },
  {
    id: 'shipping-policy',
    question: 'Shipping Policy',
    bullets: [
      'All orders are processed and delivered within 3 to 5 days after ordering.',
    ],
  },
  {
    id: 'in-store-reservations',
    question: 'In-store reservations',
    bullets: [
      'When you reserve an item on the website (SAMO Showroom Pickup), your garment is held for 24 hours (1 day) after reserving online.',
      'Within this 24-hour window, you may visit our store, try the item in store, and complete your checkout.',
    ],
  },
];

export const FaqSection: React.FC = () => {
  // All questions start closed until the user clicks to open one
  const [openId, setOpenId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      id="samo-faq-section"
      data-testid="faq-section"
      aria-labelledby="samo-faq-heading"
      className="bg-white text-zinc-950 border-t border-zinc-200 py-10 sm:py-14 px-4 sm:px-6 lg:px-10"
    >
      <div className="max-w-3xl mx-auto space-y-5">
        <h2
          id="samo-faq-heading"
          className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-zinc-950 text-center"
        >
          Frequently Asked Questions
        </h2>

        <div className="space-y-2.5">
          {FAQ_ENTRIES.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                data-testid={`faq-item-${item.id}`}
                className={`border bg-white transition-colors ${
                  isOpen
                    ? 'border-zinc-950'
                    : 'border-zinc-300 hover:border-zinc-950'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-600 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-zinc-950' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    data-testid={`faq-content-${item.id}`}
                    className="px-4 sm:px-5 pb-4 pt-1 border-t border-zinc-200 text-xs text-zinc-700 leading-relaxed"
                  >
                    <ul className="space-y-1.5 list-disc list-inside marker:text-zinc-400 pt-2">
                      {item.bullets.map((line, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
