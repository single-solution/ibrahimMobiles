# Ibrahim Mobiles — Functional Specification

## 1. Domain & Catalog Rules

| Entity | Definition | Business Rules & Invariants |
|---|---|---|
| **Category** | Top-level taxonomy | • **Cascade:** Hiding a category hides **all** its products from the storefront.<br>• **Integrity:** Cannot be deleted if referenced by products, brands, or grades. |
| **Brand** | Manufacturer | • **Scoping:** Brands are per-category (e.g., Apple in Phones vs Apple in Watches).<br>• **Integrity:** Cannot be deleted if products exist. |
| **Grade** | Condition tier | • **Scoping:** Per-category (e.g., "Like New").<br>• **Display:** Drives badges, colors, and optional inspection videos on the PDP. |
| **Attribute** | Custom dimension | • **Scoping:** Per-category (e.g., Storage, RAM, Color).<br>• **Visibility Rules:** Can be set to show *Always*, *By Brand*, *By Grade*, or *By Parent Attribute* (cascading). |
| **Product** | Listing shell | • **Visibility:** Visible ONLY IF active, not archived, category active, brand active, AND has ≥1 variant.<br>• **Media:** Up to 8 shared photos per product (variants share the gallery). |
| **Variant** | Sellable SKU | • **Truth:** The absolute source of truth for price, stock, and condition.<br>• **Stock:** In-stock if `quantity > 0`. Reserved at checkout, released on cancel/refund/return. |

---

## 2. Storefront: Global & Navigation

| Component | Behavior & Conditionals |
|---|---|
| **Navigation** | • **Desktop:** Sticky top header.<br>• **Mobile:** Compact header + fixed bottom tab bar.<br>• **Auth State:** "Account" vs "Sign in" label resolves client-side. |
| **Search Overlay** | • **< 2 chars:** Shows random hints + 5 recent browser searches.<br>• **≥ 2 chars:** Debounced live results (max 10) with variant counts.<br>• **Submit:** Routes to `/shop?q=...` and saves to recent searches. Max 100 chars. |
| **Notice Banner** | • Shown only if enabled in Admin with text. Dismissible for the session. |

---

## 3. Storefront: Shop & Filters

| Feature | Rules & Conditionals |
|---|---|
| **Routing** | • `/shop`: Redirects to first active category.<br>• `/shop?q=...`: Renders global search results.<br>• `/shop/{category}`: Full listing. 404 if unknown. "Coming soon" if inactive. |
| **Filters (AND logic)** | • **Sync:** All active filters sync to URL query params.<br>• **Pagination:** Changing any filter resets infinite scroll to page 1.<br>• **Dynamic Facets:** Attribute options load dynamically based on current filter set.<br>• **Price:** Min/Max requires explicit "Apply" click.<br>• **Hiding:** Zero-count brand/grade options are hidden unless currently selected. |
| **Infinite Scroll** | • **Batch:** 24 items per page.<br>• **Trigger:** Auto-loads ~600px before end, or via "Load more" fallback.<br>• **URL:** Furthest-loaded page replaces browser history (no full navigation). |
| **Deals Page** | • **Offers:** Streams in active offers. Hidden if none exist.<br>• **Sale Grid:** Shows admin-flagged "Featured" products. |

---

## 4. Storefront: Product Detail Page (PDP)

| Element | Rules & Conditionals |
|---|---|
| **URL Sync** | • Variant selections sync to URL params.<br>• Invalid/unknown combos silently reset to defaults.<br>• Legacy `?variant=id` auto-redirects to readable attribute params. |
| **Configurator** | • **Incomplete:** Price hidden, missing attributes highlighted.<br>• **Complete:** Price, stock, quantity stepper, and "Add to cart" appear.<br>• **Closest Match:** If exact combo doesn't exist, auto-selects closest stocked variant and shows a pre-filled WhatsApp inquiry button. |
| **Stock & Qty** | • **Max Qty:** Variant stock minus current cart quantity.<br>• **Shortcut:** "Buy all (N)" appears if stock > 1 and qty < max.<br>• **Sold Out:** Button disabled. Mobile sticky bar drops WhatsApp button. |
| **Pricing** | • Evaluates active offers client-side.<br>• Shows strikethrough, discounted price, and offer badge if applicable. |

---

## 5. Storefront: Cart & Checkout

| Feature | Rules & Conditionals |
|---|---|
| **Cart Limits** | • **Max Lines:** 20 distinct product+variant pairs.<br>• **Max Qty:** 10 per line (or variant stock, whichever is lower).<br>• **Persistence:** LocalStorage, syncs across tabs, survives refresh. |
| **Checkout Auth** | • **Guest:** Blocked. Shows read-only summary and sign-in panel.<br>• **Signed-in:** Allowed to proceed. |
| **Delivery Step** | • **Pickup:** Free.<br>• **Courier:** Flat Rs 1,500 OR Free if subtotal ≥ admin threshold.<br>• **Address:** Required for courier. Pre-fills default saved address. |
| **Payment Step** | • Options: Bank Transfer, Easypaisa, JazzCash, COD (toggled in admin).<br>• **Discount:** Bank Transfer automatically applies admin-configured % discount. |
| **Loyalty Step** | • **Min Redeem:** 100 points.<br>• **Max Redeem:** 20% of order subtotal.<br>• **Blocker:** Disabled if an active offer explicitly disallows loyalty redemption.<br>• **Input:** Toggle applies max available automatically (no partial manual entry). |
| **Placement** | • **Validation:** Name > 1 char, Phone ≥ 7 chars, Address valid, Policy checked.<br>• **Security:** Idempotency key prevents double-charges.<br>• **Server Truth:** Prices re-fetched from DB. Client prices ignored.<br>• **Stock:** Reserved atomically at placement. Insufficient stock throws error. |

---

## 6. Storefront: Auth & Account

| Feature | Rules & Conditionals |
|---|---|
| **OTP Issue** | • **Identity:** Phone number (normalized to last 10 digits). No passwords.<br>• **Format:** 6-digit numeric code, hashed in DB, 5-minute expiry.<br>• **Limits:** Resend cooldown 30s. Max 5 issues / 15 min per IP+Phone.<br>• **Fallback:** If SMS provider fails (5xx), UI offers "I have a code from our team" for admin manual codes. |
| **OTP Verify** | • **Limits:** Max 5 wrong guesses per code, then code is invalidated.<br>• **Success:** Creates/finds customer. Claims any anonymous chat threads matching the phone. Mints 30-day persistent HTTP-only session. |
| **Profile** | • Phone is immutable.<br>• Name and City required to save.<br>• Addresses: Max 6. Cannot delete the last remaining address. |

---

## 7. Chat & AI Assistant

| Feature | Rules & Conditionals |
|---|---|
| **Guest Limits** | • Guests get 5 customer-authored messages max.<br>• After 5, composer is replaced by a sign-in gate.<br>• Threads merge to customer account upon sign-in. |
| **AI Auto-Reply** | • Triggers after customer messages if enabled and not in escalation grace period.<br>• **Pacing:** Bubbles drip with human-paced typing delays (200-260 cpm).<br>• **Tools:** Can search catalog, check stock, list deals, check user orders/loyalty (scoped strictly to session ID). |
| **Escalation** | • **Trigger:** Model calls `escalate_to_human` OR customer uses keywords (human, manager, lawyer, scam, etc.).<br>• **Effect:** Mutes AI for 3 minutes. Flags thread "Needs senior" in admin.<br>• **Grace Expiry:** If no admin replies in 3 mins, AI resumes in "reassurance-only" mode (cannot reopen escalated issue). |

---

## 8. Loyalty & Offers Engine

| Feature | Rules & Conditionals |
|---|---|
| **Offers Engine** | • **Evaluation:** Sequential based on admin `sortOrder`.<br>• **Stacking:** First applied non-stackable offer stops evaluation.<br>• **Conditions:** Product, Category, Brand, Grade, Attribute, Price Range, Cart Total.<br>• **Actions:** % off, Fixed Rs off, Free Shipping.<br>• **Target:** Matched items only OR entire cart. |
| **Loyalty Earn** | • **Rate:** Configurable % of subtotal (e.g., 1%).<br>• **Trigger:** Points credited ONLY when order status → `delivered`.<br>• **Reversal:** Points reversed if a `delivered` order changes to `cancelled` or `refunded`. |
| **Loyalty Value** | • 1 Point = Rs 1. |

---

## 9. Admin: Roles & Permissions

*Super-admin flag bypasses all role matrices and grants all keys.*

| Role | Capabilities & Limits |
|---|---|
| **Owner** | Full access. Only role with `order_delete` and `data_cleanup`. |
| **Business Mgr** | Catalog, Orders, Customers, Loyalty, Chat, Offers, Settings.<br>*Blocked:* Team invites, hard deletes, data cleanup. |
| **Product Mgr** | Catalog CRUD and Media only. |
| **Marketing Mgr** | Offers, Categories, Brands, Media. Read-only products. |
| **Support Staff** | Read-only Catalog/Orders/Customers. Can view + reply to chats. |

---

## 10. Admin: Orders Workspace

| Status | Allowed Actions & Side Effects |
|---|---|
| `pending-payment` | • **Editable:** Line items, address, payment, delivery.<br>• **Stock:** Editing lines swaps stock reservations atomically. |
| `confirmed` | • Order locked (read-only). Payment acknowledged. |
| `packed` | • **Blocker:** Cannot enter this state without uploading/pasting a `dispatchVideoUrl`. |
| `dispatched` | • With courier. Cannot move status backward from here. |
| `delivered` | • **Side Effect:** Credits `pointsEarned` to customer loyalty balance. |
| `cancelled` / `refunded` | • **Side Effect:** Releases reserved stock.<br>• **Side Effect:** Reverses loyalty points *if* previously delivered. |
| `returned` | • **Side Effect:** Releases reserved stock. (Does *not* reverse loyalty). |

---

## 11. Admin: Customers & Inquiries

| Workspace | Rules & Conditionals |
|---|---|
| **Customers** | • **Segments:** All, Loyalty, With Orders.<br>• **Counts:** Total loyalty balance streams in progressively.<br>• **Delete:** Blocked if `orderCount > 0`.<br>• **Manual OTP:** Admins can generate a 15-min sign-in code for users failing to get SMS. |
| **Inquiries** | • **Filters:** Anonymous threads are excluded from the default view.<br>• **Read State:** Opening a thread zeros `unreadByTeam`. Replying increments `unreadByCustomer`.<br>• **Assignment:** Replying to an unassigned thread auto-assigns it to the operator. |

---

## 12. Admin: Catalog & Settings

| Workspace | Rules & Conditionals |
|---|---|
| **Products** | • **Delete:** Blocked if referenced by orders. Use `isActive` toggle instead.<br>• **Variants:** Duplicate attribute combinations are rejected by the server. |
| **Settings** | • **Live Updates:** Changes to branding, policies, payments, and chat config apply to the storefront immediately.<br>• **Data Cleanup:** Owner-only tool to bulk-delete catalog, orders, customers, or inquiries. |
| **Activity Log** | • Append-only audit trail of all mutations (actor, action, resource, timestamp). Failures to log do not block business operations. |