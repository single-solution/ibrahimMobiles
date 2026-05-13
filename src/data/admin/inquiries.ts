export type InquiryStatus =
  | "new"
  | "contacted"
  | "advance-paid"
  | "video-sent"
  | "dispatched"
  | "delivered"
  | "cancelled"
  | "money-back";

export type InquirySource = "whatsapp" | "ai-chat" | "form" | "phone" | "instagram";

export interface Inquiry {
  id: string;
  customerName: string;
  customerCity: string;
  phoneNumber: string;
  modelName: string;
  variantSummary: string;
  expectedRupees: number;
  source: InquirySource;
  status: InquiryStatus;
  receivedAt: string;
  lastMessage: string;
  notes?: string;
}

export const inquiries: Inquiry[] = [
  {
    id: "inq-001",
    customerName: "Hamza Tariq",
    customerCity: "Karachi",
    phoneNumber: "+92 333 1234567",
    modelName: "iPhone 15 Pro",
    variantSummary: "Genuine · A+ · 256 GB · Natural Titanium",
    expectedRupees: 349_000,
    source: "whatsapp",
    status: "new",
    receivedAt: "2026-05-13T18:42:00.000Z",
    lastMessage: "Salam, iPhone 15 Pro 256 ka final price kya hoga? Bank transfer karunga.",
  },
  {
    id: "inq-002",
    customerName: "Sana Iqbal",
    customerCity: "Lahore",
    phoneNumber: "+92 321 9876543",
    modelName: "iPhone 14",
    variantSummary: "Genuine · A · 128 GB · Blue",
    expectedRupees: 158_000,
    source: "ai-chat",
    status: "advance-paid",
    receivedAt: "2026-05-13T16:15:00.000Z",
    lastMessage: "Easypaisa par 5000 advance bhej diya hai, video kab milegi?",
    notes: "Advance Rs 5,000 received via Easypaisa.",
  },
  {
    id: "inq-003",
    customerName: "Ali Raza",
    customerCity: "Islamabad",
    phoneNumber: "+92 300 5512378",
    modelName: "Galaxy S24 Ultra",
    variantSummary: "Box-open · A+ · 512 GB · Titanium Black",
    expectedRupees: 295_000,
    source: "whatsapp",
    status: "video-sent",
    receivedAt: "2026-05-13T13:21:00.000Z",
    lastMessage: "Video receive ho gaya. Bank transfer karta hoon, courier kis time ayegi?",
    notes: "Awaiting full bank transfer to dispatch.",
  },
  {
    id: "inq-004",
    customerName: "Fatima Khan",
    customerCity: "Multan",
    phoneNumber: "+92 312 1144567",
    modelName: "iPhone 13",
    variantSummary: "China pack · B · 128 GB · Midnight",
    expectedRupees: 95_000,
    source: "form",
    status: "dispatched",
    receivedAt: "2026-05-12T10:48:00.000Z",
    lastMessage: "TCS tracking number share kar dein please.",
  },
  {
    id: "inq-005",
    customerName: "Bilal Hussain",
    customerCity: "Faisalabad",
    phoneNumber: "+92 345 6677889",
    modelName: "Pixel 8 Pro",
    variantSummary: "Genuine · A+ · 256 GB · Obsidian",
    expectedRupees: 164_000,
    source: "instagram",
    status: "contacted",
    receivedAt: "2026-05-13T09:08:00.000Z",
    lastMessage: "Aur cheaper Pixel hai? Maximum 150k tak ja sakta hoon.",
  },
  {
    id: "inq-006",
    customerName: "Areeba Tariq",
    customerCity: "Lahore",
    phoneNumber: "+92 313 2245667",
    modelName: "iPhone 12",
    variantSummary: "LCD shaded · C · 64 GB · Purple",
    expectedRupees: 58_000,
    source: "whatsapp",
    status: "delivered",
    receivedAt: "2026-05-10T11:11:00.000Z",
    lastMessage: "Phone mil gaya, in-person verify ho gaya. Thanks!",
  },
  {
    id: "inq-007",
    customerName: "Zubair Ahmed",
    customerCity: "Peshawar",
    phoneNumber: "+92 301 9988776",
    modelName: "Galaxy S23",
    variantSummary: "Genuine · A · 256 GB · Cream",
    expectedRupees: 159_000,
    source: "phone",
    status: "cancelled",
    receivedAt: "2026-05-09T17:30:00.000Z",
    lastMessage: "Sorry, plan change ho gaya hai.",
    notes: "Customer changed their mind before advance payment.",
  },
  {
    id: "inq-008",
    customerName: "Ayesha Malik",
    customerCity: "Hyderabad",
    phoneNumber: "+92 322 4455667",
    modelName: "iPhone 14",
    variantSummary: "Refurbished · A · 128 GB · Midnight",
    expectedRupees: 132_000,
    source: "ai-chat",
    status: "money-back",
    receivedAt: "2026-05-08T14:00:00.000Z",
    lastMessage: "15 din ke andar moneyback claim karna chahti hoon.",
    notes: "Inspection scheduled at Hall Road counter.",
  },
  {
    id: "inq-009",
    customerName: "Usman Ghani",
    customerCity: "Rawalpindi",
    phoneNumber: "+92 334 7788992",
    modelName: "iPhone 15 Pro",
    variantSummary: "Genuine · A · 256 GB · Blue Titanium",
    expectedRupees: 329_000,
    source: "whatsapp",
    status: "new",
    receivedAt: "2026-05-13T20:01:00.000Z",
    lastMessage: "Available hai? Aaj hi confirm karna chahta hoon.",
  },
  {
    id: "inq-010",
    customerName: "Mehwish Iftikhar",
    customerCity: "Lahore",
    phoneNumber: "+92 333 1010102",
    modelName: "iPhone 14",
    variantSummary: "China pack · A · 128 GB · Blue",
    expectedRupees: 122_000,
    source: "ai-chat",
    status: "new",
    receivedAt: "2026-05-13T19:35:00.000Z",
    lastMessage: "Lahore mein in-store verify kar sakti hoon?",
  },
  {
    id: "inq-011",
    customerName: "Daniyal Sheikh",
    customerCity: "Karachi",
    phoneNumber: "+92 308 1212345",
    modelName: "iPhone 13",
    variantSummary: "Genuine · A · 128 GB · Midnight",
    expectedRupees: 138_000,
    source: "whatsapp",
    status: "contacted",
    receivedAt: "2026-05-13T11:45:00.000Z",
    lastMessage: "OK, payment plan share kar dein.",
  },
  {
    id: "inq-012",
    customerName: "Rabia Yousuf",
    customerCity: "Multan",
    phoneNumber: "+92 311 9090201",
    modelName: "Galaxy S24 Ultra",
    variantSummary: "Genuine · A+ · 512 GB · Titanium Gray",
    expectedRupees: 339_000,
    source: "form",
    status: "video-sent",
    receivedAt: "2026-05-13T08:00:00.000Z",
    lastMessage: "Video me sab clear hai, payment proceed kar rahi hoon.",
  },
];

export function getInquiryStatusLabel(status: InquiryStatus): string {
  const labels: Record<InquiryStatus, string> = {
    new: "New",
    contacted: "Contacted",
    "advance-paid": "Advance paid",
    "video-sent": "Video sent",
    dispatched: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
    "money-back": "Moneyback",
  };
  return labels[status];
}

export function getInquirySourceLabel(source: InquirySource): string {
  const labels: Record<InquirySource, string> = {
    whatsapp: "WhatsApp",
    "ai-chat": "AI chat",
    form: "Web form",
    phone: "Phone",
    instagram: "Instagram",
  };
  return labels[source];
}
