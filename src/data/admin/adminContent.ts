export interface ContentBlock {
  id: string;
  label: string;
  description?: string;
  value: string;
  isMultiline?: boolean;
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export const homeContentBlocks: ContentBlock[] = [
  {
    id: "home-eyebrow",
    label: "Hero eyebrow",
    value: "Pre-owned phones, honestly graded",
  },
  {
    id: "home-headline",
    label: "Hero headline",
    value: "Hall Road quality.\nDelivered to your door.",
    isMultiline: true,
  },
  {
    id: "home-subhead",
    label: "Hero subhead",
    value:
      "Multi-grade stock — genuine, brand-new, refurb, China pack and more — every unit graded by us, with a 15-day moneyback guarantee.",
    isMultiline: true,
  },
  {
    id: "home-trust-line",
    label: "Trust line under hero",
    value:
      "15-day moneyback · PTA-approved options · Video before dispatch · 5% off bank transfer",
  },
  {
    id: "home-latest-stock-eyebrow",
    label: "Latest stock eyebrow",
    value: "Just landed",
  },
  {
    id: "home-latest-stock-title",
    label: "Latest stock section title",
    value: "Latest stock arrived",
  },
];

export const aboutContentBlocks: ContentBlock[] = [
  {
    id: "about-headline",
    label: "About headline",
    value: "Run by phone people, for phone people.",
  },
  {
    id: "about-body",
    label: "About body",
    isMultiline: true,
    value:
      "Three generations on Hall Road. We've graded over 18,000 phones since 2008 — and every unit you see online is the same unit you'd see at the counter. No stock photos, no surprises.",
  },
  {
    id: "about-buying-process",
    label: "How buying works (online)",
    isMultiline: true,
    value:
      "1. Pick a unit and confirm with us on WhatsApp.\n2. Pay an advance via Easypaisa or JazzCash.\n3. We send a video of YOUR unit (IMEI, screen, body).\n4. You approve, we dispatch — full bank transfer is 5% off.",
  },
  {
    id: "about-warranty",
    label: "Warranty & moneyback",
    isMultiline: true,
    value:
      "15-day moneyback for any reason. Brand-new units carry company warranty. Used stock is 3–6 months for genuine faults — physical damage or liquid contact excluded.",
  },
];

export const faqEntries: FaqEntry[] = [
  {
    id: "faq-pta",
    question: "Are all phones PTA approved?",
    answer:
      "Most genuine units are PTA approved — it's marked clearly on each variant. China-pack and some refurb units may need PTA tax separately; we always mention it in the listing.",
  },
  {
    id: "faq-cod",
    question: "Can I pay cash on delivery?",
    answer:
      "Cash on delivery is only available in Lahore, where you can verify the unit in person before paying. For other cities we ship after a small advance + a video confirmation.",
  },
  {
    id: "faq-bank-transfer",
    question: "How does the 5% bank transfer discount work?",
    answer:
      "Pay the full amount via bank transfer (HBL, Meezan, UBL, Bank Alfalah, Allied — any major Pakistani bank) before dispatch and we apply a flat 5% discount on the spot.",
  },
  {
    id: "faq-moneyback",
    question: "What does the 15-day moneyback cover?",
    answer:
      "If you change your mind for any reason in the first 15 days, return the unit unmodified and we refund 100%. Refunds are processed by bank transfer within 48 hours.",
  },
  {
    id: "faq-warranty",
    question: "Does the warranty cover physical damage?",
    answer:
      "No. Warranty covers genuine factory faults only — battery degradation beyond stated range, motherboard issues, etc. Physical damage, water damage and unauthorised repairs void the warranty.",
  },
  {
    id: "faq-grades",
    question: "What does each grade mean?",
    answer:
      "A+: like new, no marks. A: very light wear, screen flawless. B: visible scuffs. C: heavier cosmetic wear, fully functional. We grade strictly — most stores call our B an A.",
  },
];

export const footerContentBlocks: ContentBlock[] = [
  {
    id: "footer-tagline",
    label: "Footer tagline",
    isMultiline: true,
    value:
      "Pakistan's most trusted pre-owned phone store. Hall Road since 2008.",
  },
  {
    id: "footer-copyright",
    label: "Copyright line",
    value: "© Ibrahim Mobile Store. All rights reserved.",
  },
];
