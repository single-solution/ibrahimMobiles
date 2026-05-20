/**
 * Wire types shared between admin API routes and admin client components.
 * Mirrors PLAN.md §10 1:1 — when the Mongoose schema changes, this file
 * changes; when this file changes, the serializers under
 * `apps/admin/src/lib/serializers/` and the components under
 * `apps/admin/src/components/` change in lockstep.
 *
 * Phase 1 (this commit) brings every entity onto the new shape:
 *   - Categories, brands, grades, attributes are admin-authored,
 *     slug-keyed, and per-category.
 *   - Products are thin shells; all content lives on variants.
 *   - Variants carry `StoredImage[]` (universal 4-variant pipeline) +
 *     dynamic `attributes: Record<string, string>` (no more hardcoded
 *     phone / accessory fields).
 *   - Inquiries are threaded chats; the legacy flat-snapshot shape is
 *     gone.
 *   - Offers use hex `color` (matching Grade); accentColor enum gone.
 *   - User role enum trimmed to the modern five.
 */
import type { StoredImage } from "@store/shared";

export interface AdminBrand {
  id: string;
  slug: string;
  name: string;
  categorySlugs: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type AdminCategoryIconKind = "emoji" | "image";

export interface AdminCategory {
  id: string;
  slug: string;
  label: string;
  description: string;
  iconKind: AdminCategoryIconKind;
  iconEmoji?: string;
  iconImage?: StoredImage;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGrade {
  id: string;
  categorySlug: string;
  slug: string;
  label: string;
  notes: string;
  color: string;
  video: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminAttributeCardPosition =
  | "image-overlay"
  | "title-chips"
  | "none";

export interface AdminAttributeOption {
  value: string;
  label: string;
}

export interface AdminAttribute {
  id: string;
  categorySlug: string;
  slug: string;
  label: string;
  options: AdminAttributeOption[];
  cardPosition: AdminAttributeCardPosition;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Products
// ============================================================================

export interface AdminVariant {
  id: string;
  gradeSlug: string;
  priceRupees: number;
  quantity: number;
  warrantyMonths?: number;
  images: StoredImage[];
  /**
   * Per-attribute chosen option value. Keys are `Attribute.slug` (per the
   * product's category); values are option `value` strings.
   */
  attributes: Record<string, string>;
}

export interface AdminProductSummary {
  id: string;
  slug: string;
  name: string;
  brand: { slug: string; name: string };
  categorySlug: string;
  isFeatured: boolean;
  isActive: boolean;
  isArchived: boolean;
  variantCount: number;
  inStockCount: number;
  minPriceRupees?: number;
  /** First image of the first variant, or null when the catalogue is empty. */
  heroImage: StoredImage | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct extends AdminProductSummary {
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
// Inquiries (threaded chat — PLAN §12)
// ============================================================================

export type AdminInquiryStatus = "open" | "awaiting-customer" | "resolved";
export type AdminInquiryMessageAuthor = "customer" | "agent";

export interface AdminInquiryImageAttachment {
  kind: "image";
  image: StoredImage;
}
export interface AdminInquiryFileAttachment {
  kind: "file";
  url: string;
  mime: string;
  sizeBytes: number;
  filename: string;
}
export type AdminInquiryAttachment =
  | AdminInquiryImageAttachment
  | AdminInquiryFileAttachment;

export interface AdminInquiryMessage {
  id: string;
  author: AdminInquiryMessageAuthor;
  authorName?: string;
  authorUserId?: string;
  body: string;
  attachments?: AdminInquiryAttachment[];
  createdAt: string;
  readByCustomerAt?: string;
}

export interface AdminInquirySummary {
  id: string;
  customerId?: string;
  customerName: string;
  phoneNumber: string;
  subjectProductId?: string;
  subjectProductName?: string;
  status: AdminInquiryStatus;
  assignedToUserId?: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  lastMessageAuthor: AdminInquiryMessageAuthor;
  unreadByCustomer: number;
  unreadByTeam: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminInquiry extends AdminInquirySummary {
  internalNotes?: string;
  messages: AdminInquiryMessage[];
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
  color: string;
  bannerImage: StoredImage | null;
  expiresAt?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
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

export type AdminUserRole =
  | "owner"
  | "business_manager"
  | "product_manager"
  | "marketing_manager"
  | "support_staff";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: AdminUserRole;
  isSuperAdmin: boolean;
  isActive: boolean;
  lastSignInAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Activity log
// ============================================================================

export type AdminActivityResourceType =
  | "product"
  | "brand"
  | "category"
  | "grade"
  | "attribute"
  | "order"
  | "customer"
  | "loyalty"
  | "inquiry"
  | "offer"
  | "team"
  | "settings"
  | "auth";

export interface AdminActivityEntry {
  id: string;
  actorUserId?: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: AdminActivityResourceType;
  resourceId?: string;
  resourceLabel: string;
  detail?: string;
  createdAt: string;
  updatedAt: string;
}
