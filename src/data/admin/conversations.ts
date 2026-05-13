export type ConversationParticipant = "customer" | "ai" | "agent";

export interface ConversationMessage {
  id: string;
  participant: ConversationParticipant;
  content: string;
  sentAt: string;
}

export interface AdminConversation {
  id: string;
  customerName: string;
  customerCity: string;
  startedAt: string;
  lastMessageAt: string;
  topic: string;
  status: "open" | "resolved" | "handed-off";
  messageCount: number;
  preview: string;
  messages: ConversationMessage[];
}

export const conversations: AdminConversation[] = [
  {
    id: "conv-001",
    customerName: "Sana Iqbal",
    customerCity: "Lahore",
    startedAt: "2026-05-13T15:48:00.000Z",
    lastMessageAt: "2026-05-13T16:12:00.000Z",
    topic: "iPhone 14 — variant comparison",
    status: "handed-off",
    messageCount: 8,
    preview: "Easypaisa par 5000 advance bhej diya hai…",
    messages: [
      {
        id: "m1",
        participant: "customer",
        content: "Salam! iPhone 14 128 ka best price kya hoga?",
        sentAt: "2026-05-13T15:48:00.000Z",
      },
      {
        id: "m2",
        participant: "ai",
        content:
          "Walaikum-salam! iPhone 14 128 GB hamare paas teen variants me available hai:\n• Genuine A grade — Rs 158,000\n• China water pack A — Rs 122,000\n• Refurbished A — Rs 132,000\nKaunsa preference hai?",
        sentAt: "2026-05-13T15:49:00.000Z",
      },
      {
        id: "m3",
        participant: "customer",
        content: "Genuine wala. Aur 5% bank transfer wala discount lagega?",
        sentAt: "2026-05-13T15:51:00.000Z",
      },
      {
        id: "m4",
        participant: "ai",
        content:
          "Bilkul. Full bank transfer karein toh 5% off — yani Rs 150,100 final. Easypaisa/JazzCash par sirf 5000 advance lete hain confirmation ke liye.",
        sentAt: "2026-05-13T15:52:00.000Z",
      },
      {
        id: "m5",
        participant: "customer",
        content: "Easypaisa par 5000 advance bhej diya hai, video kab milegi?",
        sentAt: "2026-05-13T16:12:00.000Z",
      },
    ],
  },
  {
    id: "conv-002",
    customerName: "Hamza Tariq",
    customerCity: "Karachi",
    startedAt: "2026-05-13T18:38:00.000Z",
    lastMessageAt: "2026-05-13T18:42:00.000Z",
    topic: "iPhone 15 Pro 256 — pricing",
    status: "open",
    messageCount: 4,
    preview: "Bank transfer karunga, final price kya hoga?",
    messages: [
      {
        id: "m1",
        participant: "customer",
        content: "Salam, iPhone 15 Pro 256 ka final price kya hoga? Bank transfer karunga.",
        sentAt: "2026-05-13T18:38:00.000Z",
      },
      {
        id: "m2",
        participant: "ai",
        content:
          "Walaikum-salam! Genuine A+ Natural Titanium ka MRP Rs 349,000 hai. Full bank transfer par 5% off — Rs 331,550 final.",
        sentAt: "2026-05-13T18:39:00.000Z",
      },
      {
        id: "m3",
        participant: "customer",
        content: "PTA approved hai? Aur warranty kitni hai?",
        sentAt: "2026-05-13T18:41:00.000Z",
      },
      {
        id: "m4",
        participant: "ai",
        content:
          "Ji haan, PTA approved hai aur 6 mahine ki shop warranty deta hai (genuine faults — physical damage exclude). 15 din moneyback bhi.",
        sentAt: "2026-05-13T18:42:00.000Z",
      },
    ],
  },
  {
    id: "conv-003",
    customerName: "Ayesha Malik",
    customerCity: "Hyderabad",
    startedAt: "2026-05-08T13:55:00.000Z",
    lastMessageAt: "2026-05-08T14:00:00.000Z",
    topic: "Moneyback request — iPhone 14 refurbished",
    status: "resolved",
    messageCount: 6,
    preview: "15 din ke andar moneyback claim…",
    messages: [
      {
        id: "m1",
        participant: "customer",
        content: "15 din ke andar moneyback claim karna chahti hoon.",
        sentAt: "2026-05-08T13:55:00.000Z",
      },
      {
        id: "m2",
        participant: "ai",
        content:
          "Bilkul, 15-day moneyback hamari guarantee hai. Aap Hall Road counter par phone le aaeen ya hum courier arrange kar dein?",
        sentAt: "2026-05-08T13:57:00.000Z",
      },
      {
        id: "m3",
        participant: "customer",
        content: "Courier arrange karein. IMEI hai already aapke pas.",
        sentAt: "2026-05-08T13:58:00.000Z",
      },
      {
        id: "m4",
        participant: "agent",
        content:
          "Hyderabad se TCS pickup confirm ho gaya, aap ko tracking number bhej dein ge. Refund 48 hrs me bank transfer.",
        sentAt: "2026-05-08T14:00:00.000Z",
      },
    ],
  },
  {
    id: "conv-004",
    customerName: "Bilal Hussain",
    customerCity: "Faisalabad",
    startedAt: "2026-05-13T08:50:00.000Z",
    lastMessageAt: "2026-05-13T09:08:00.000Z",
    topic: "Pixel 8 Pro — budget under 150k",
    status: "open",
    messageCount: 5,
    preview: "Aur cheaper Pixel hai? Max 150k tak.",
    messages: [
      {
        id: "m1",
        participant: "customer",
        content: "Pixel 8 Pro genuine kitne ka hai?",
        sentAt: "2026-05-13T08:50:00.000Z",
      },
      {
        id: "m2",
        participant: "ai",
        content: "Pixel 8 Pro 256 GB Obsidian Genuine A+ — Rs 164,000.",
        sentAt: "2026-05-13T08:52:00.000Z",
      },
      {
        id: "m3",
        participant: "customer",
        content: "Aur cheaper Pixel hai? Maximum 150k tak ja sakta hoon.",
        sentAt: "2026-05-13T09:08:00.000Z",
      },
    ],
  },
  {
    id: "conv-005",
    customerName: "Areeba Tariq",
    customerCity: "Lahore",
    startedAt: "2026-05-10T10:55:00.000Z",
    lastMessageAt: "2026-05-10T11:11:00.000Z",
    topic: "iPhone 12 LCD shaded — verify in-person",
    status: "resolved",
    messageCount: 3,
    preview: "Phone mil gaya, in-person verify ho gaya.",
    messages: [
      {
        id: "m1",
        participant: "customer",
        content: "iPhone 12 LCD shaded screen kitni dark hai? Daily use chal jayega?",
        sentAt: "2026-05-10T10:55:00.000Z",
      },
      {
        id: "m2",
        participant: "ai",
        content:
          "Hall Road par physically dekh sakte hain. Faint shadow hai upper left corner par, lekin daily use ke liye fine hai. Counter par try karein, agar pasand nahi aata na lein.",
        sentAt: "2026-05-10T10:58:00.000Z",
      },
      {
        id: "m3",
        participant: "customer",
        content: "Phone mil gaya, in-person verify ho gaya. Thanks!",
        sentAt: "2026-05-10T11:11:00.000Z",
      },
    ],
  },
  {
    id: "conv-006",
    customerName: "Mehwish Iftikhar",
    customerCity: "Lahore",
    startedAt: "2026-05-13T19:20:00.000Z",
    lastMessageAt: "2026-05-13T19:35:00.000Z",
    topic: "iPhone 14 China pack — in-store check",
    status: "open",
    messageCount: 4,
    preview: "Lahore mein in-store verify kar sakti hoon?",
    messages: [
      {
        id: "m1",
        participant: "customer",
        content: "iPhone 14 China pack kitni reliable hai?",
        sentAt: "2026-05-13T19:20:00.000Z",
      },
      {
        id: "m2",
        participant: "ai",
        content:
          "China water pack ki price Rs 122,000 hai. Battery range 85–92%, 3 mahine ki shop warranty. In-store verify karna best hai aap ke liye.",
        sentAt: "2026-05-13T19:22:00.000Z",
      },
      {
        id: "m3",
        participant: "customer",
        content: "Lahore mein in-store verify kar sakti hoon?",
        sentAt: "2026-05-13T19:35:00.000Z",
      },
    ],
  },
];
