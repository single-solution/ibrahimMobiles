/**
 * Wire types shared between admin API routes and admin client components.
 * Kept separate from the storefront `@store/shared` types so the admin schema
 * can evolve (extra fields, looser nullability) without leaking through to
 * the public-facing contract.
 */

export interface AdminBrand {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategory {
  id: string;
  categoryId: "phone" | "accessory" | "gadget";
  label: string;
  pluralLabel: string;
  pathSegment: string;
  isActive: boolean;
  tagline: string;
  applicableGrades: string[];
  trustChips: string[];
  emptyHint: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGrade {
  id: string;
  grade: string;
  label: string;
  shortLabel: string;
  description: string;
  cosmeticNotes: string;
  functionalNotes: string;
  tone: "accent" | "neutral" | "info" | "warn" | "danger" | "dark";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Products
// ============================================================================

export interface AdminVariant {
  id: string;
  grade: string;
  colorName: string;
  priceRupees: number;
  originalPriceRupees: number;
  isInStock: boolean;
  warrantyMonths: number;
  notes?: string;

  storageGb?: number;
  ramGb?: number;
  batteryHealthMinPercent?: number;
  batteryHealthMaxPercent?: number;
  isPtaApproved?: boolean;

  connector?: string;
  wattage?: number;
  lengthMeters?: number;
  isGenuine?: boolean;
}

export interface AdminProductSummary {
  id: string;
  slug: string;
  modelName: string;
  category: "phone" | "accessory" | "gadget";
  accessoryType?: string;
  gadgetType?: string;
  brand: { id: string; slug: string; name: string };
  imageUrl: string;
  releaseYear: number;
  isFeatured: boolean;
  isActive: boolean;
  isArchived: boolean;
  variantCount: number;
  inStockCount: number;
  minPriceRupees?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct extends AdminProductSummary {
  galleryUrls: string[];
  highlights: string[];
  variants: AdminVariant[];
}

// ============================================================================
// Customers
// ============================================================================

export interface AdminCustomerAddress {
  id: string;
  label?: string;
  recipientName: string;
  phoneNumber: string;
  city: string;
  area?: string;
  street?: string;
  postalCode?: string;
  isDefault: boolean;
}

export interface AdminCustomerSummary {
  id: string;
  name: string;
  email?: string;
  phoneNumber: string;
  city: string;
  isLoyaltyMember: boolean;
  orderCount: number;
  lifetimeSpendRupees: number;
  lastOrderAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCustomer extends AdminCustomerSummary {
  notes?: string;
  addresses: AdminCustomerAddress[];
}

// ============================================================================
// Orders
// ============================================================================

interface AdminOrderItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantSummary: string;
  unitPriceRupees: number;
  quantity: number;
}

interface AdminOrderTimelineEntry {
  id: string;
  status: string;
  occurredAt: string;
  note?: string;
}

export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  customer: { id: string; name: string; phoneNumber: string; city: string };
  status: string;
  totalRupees: number;
  itemCount: number;
  payment: string;
  delivery: string;
  placedAt: string;
}

export interface AdminOrder extends AdminOrderSummary {
  items: AdminOrderItem[];
  totals: {
    subtotalRupees: number;
    shippingRupees: number;
    discountRupees: number;
    totalRupees: number;
  };
  address?: {
    recipientName: string;
    phoneNumber: string;
    city: string;
    area?: string;
    street?: string;
    postalCode?: string;
  };
  timeline: AdminOrderTimelineEntry[];
  trackingNote?: string;
  estimatedDeliveryAt?: string;
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Inquiries
// ============================================================================

export interface AdminInquiry {
  id: string;
  customerName: string;
  customerCity: string;
  phoneNumber: string;
  modelName: string;
  variantSummary?: string;
  expectedRupees?: number;
  source: string;
  status: string;
  receivedAt: string;
  lastMessage: string;
  notes?: string;
  productId?: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Loyalty
// ============================================================================

interface AdminLoyaltyTransaction {
  id: string;
  kind: "earn" | "redeem" | "bonus" | "expire" | "adjust";
  amount: number;
  occurredAt: string;
  reason: string;
  orderRef?: string;
}

export interface AdminLoyaltyAccount {
  id: string;
  customerId: string;
  customerName: string;
  balance: number;
  lifetimeEarned: number;
  pendingFromShipping: number;
  transactions: AdminLoyaltyTransaction[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Offers
// ============================================================================

export interface AdminOffer {
  id: string;
  slug: string;
  title: string;
  description: string;
  discountLabel: string;
  badgeLabel: string;
  accentColor: "emerald" | "amber" | "rose" | "sky";
  expiresAt?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Media library
// ============================================================================

export interface AdminMediaAsset {
  id: string;
  url: string;
  kind: "image" | "video" | "document";
  title: string;
  alt?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  tags: string[];
  uploadedById?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Conversations (AI desk)
// ============================================================================

export interface AdminConversationMessage {
  id: string;
  author: "customer" | "agent" | "ai";
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface AdminConversationSummary {
  id: string;
  customerId?: string;
  customerName: string;
  customerHandle?: string;
  channel: "chat" | "whatsapp" | "phone" | "email" | "instagram";
  topic: string;
  status: "open" | "waiting" | "resolved";
  priority: "low" | "normal" | "high" | "urgent";
  assignedToId?: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConversation extends AdminConversationSummary {
  messages: AdminConversationMessage[];
}

// ============================================================================
// Settings & store config
// ============================================================================

export interface AdminSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  group?: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Team & users
// ============================================================================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: "owner" | "manager" | "staff";
  isSuperAdmin: boolean;
  isActive: boolean;
  lastSignInAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Activity log
// ============================================================================

export interface AdminActivityEntry {
  id: string;
  actorUserId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  resourceLabel: string;
  detail?: string;
  createdAt: string;
  updatedAt: string;
}
