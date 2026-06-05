# Ibrahim Mobiles

## 1. Platform at a glance

The platform is a single online store for selling mobile phones and related electronics, made of **two connected applications** that share one catalog and one customer base:

- **Storefront** — the public shopping experience. Anyone can browse; signing in (phone + one-time code) unlocks ordering, the customer account, saved addresses, order history, loyalty, and full chat history.
- **Admin console** — the private, invitation-only back office for staff. Role-based permissions control what each operator can see and do.

**Configuration over code.** The shop's identity (name, tagline, logo, contact details, social links), policies (warranty length, money-back window, free-delivery threshold, bank-transfer discount, loyalty earn rate), payment methods, chat behavior, and SEO defaults are all editable from the admin Settings area and take effect across the storefront within about a minute — no redeployment. Nothing brand-specific is hard-coded.

**Two separate identity worlds.** Customer accounts and staff accounts are completely separate. A customer can never gain admin access, and a staff member signing in on the storefront simply creates an unrelated customer record.

---

## 2. Catalog model & domain vocabulary

The catalog is built from a small set of concepts. Understanding them is a prerequisite for everything else.

### 2.1 Category

A top-level taxonomy node (e.g. *Phones*, *Accessories*). Every product belongs to exactly one category. A category defines the vocabulary available to its products: which grades, which custom attributes, and which brands apply.

- **Identity:** a stable URL slug (auto-generated from the label if not supplied) and a customer-facing label.
- **Presentation:** description blurb, icon, sort order, and optional rich marketing content (summary + icon-tagged bullets) for the category landing page; optional per-category SEO overrides (auto-filled when absent).
- **Active flag:** when a category is inactive, it and **all** its products disappear from the storefront, even if individual products are active.
- **Rule:** a category cannot be deleted while any product, brand, grade, or attribute still references it — deactivate instead.

### 2.2 Brand

A manufacturer/vendor (e.g. *Apple*, *Samsung*). Brands are **per-category**: each brand declares the categories it applies to.

- **Rule:** a brand must belong to at least one category. Its slug is unique *within* a category (the same slug may exist under different categories).
- **Active flag:** when inactive, products using that brand in those categories are hidden from the storefront.
- **Rule:** cannot delete a brand that still has products; mark inactive instead.
- The admin product form only offers brands whose declared categories include the product's chosen category.

### 2.3 Grade (condition)

A per-category condition tier (e.g. *Brand new*, *Like new*, *Refurbished*). Grade is the primary condition axis a buyer sees, alongside brand.

- **Identity:** category + slug (unique within the category), plus a label used as a badge on listings and the product page.
- **Presentation:** a condition notes paragraph, an admin-chosen badge color (free-form hex, not a fixed palette), an optional inspection video shown on the product page, and optional structured bullets.
- **Active flag:** hidden grades drop out of filters and chips.
- **Rule:** every product variant must reference a grade that exists in the product's category.

### 2.4 Attribute (custom dimension)

Admin-defined selectable dimensions per category — anything beyond brand and grade (Storage, RAM, Color, etc.).

- **Definition:** category + slug + label, an optional shared unit suffix (e.g. `gb` renders "256 gb"), and a list of options. Each option has a canonical value (stored on variants), a display label, and an optional chip background color.
- **Visibility rules** — when the attribute appears in the variant builder and storefront filters:
  - *Always* — always shown.
  - *By brand* — only when the selected brand matches a configured set.
  - *By grade* — only when the selected grade matches a configured set.
  - *By attribute* — only when a parent attribute has a specific option selected (cascading; changing the parent clears the dependent child selection).
- **Card position:** where the attribute's chips render on a product card — image overlay, title chips, or hidden.
- **Rule:** an attribute must have at least one option. A variant may hold multiple values for one attribute (e.g. three available colors). Variant values must match an option value, or supply a custom display label for product-only values.

### 2.5 Product and Variant

- A **Product** is a listing shell: identity (slug, name), its one category and one brand, on/off and feature flags, an ordered photo gallery (the first image is the hero used everywhere — cards, product page, social cards), optional SEO overrides, and a list of variants. The product wizard accepts up to 8 photos in the shared gallery; all variants share that same gallery (there are no per-variant photos).
- A **Variant** is the actual sellable unit and the source of truth for inventory and price: a grade reference, a price (whole rupees), a stock quantity, an optional warranty term (in days), and its attribute values.

**Catalog visibility cascade.** A product is visible on the storefront only if **all** hold: the product is active, not archived, has at least one variant, its category is active, and its brand is active for that category. A product with zero variants is treated as non-existent on the storefront.

**Stock truth.** There is no separate "in stock" flag — a variant is in stock when its quantity is greater than zero. Stock is reserved at order placement and released only on a terminal cancel/refund/return (once per order).

**Price authority.** Client-supplied prices are never trusted. At checkout the server re-reads each variant's price from the catalog and recomputes all totals.

**Flags:** *Active* (master on/off for the listing), *Archived* (soft removal, distinct from inactive; archived items are excluded from default catalog views), *Featured* (boosts the product into featured rails and the deals "on sale" grid).

---

## 3. Storefront

### 3.1 Global shell & navigation

- **Mobile vs desktop.** Mobile uses a compact top header plus a fixed bottom tab bar (Home, Shop, Deals, Cart, Account) and adds bottom padding on product/checkout pages so content clears the tab bar. Desktop uses a sticky top header with full navigation.
- **Primary navigation:** Home, Shop (lands on the first active category), Deals, Search, Account/Sign-in, Cart.
- **Conditional (signed in):** the account control reads "Account" when a session exists and "Sign in" otherwise (resolved after a client session check).
- **Cart access:** on desktop the cart button opens a dropdown popover (closes on navigation); on mobile the Cart tab opens the full cart page (no dropdown).
- **Store notice banner:** shown only when the admin enables it and sets text; dismissible for the session and then hidden.
- **404 page:** message plus links back to home and the shop.

### 3.2 Search overlay

1. Opens full-screen from the header search control; body scroll locks; the input auto-focuses; Escape closes.
2. **Conditional (query under 2 characters):** shows randomized suggestion chips plus up to 5 recent searches from the browser.
3. **Conditional (query 2+ characters):** debounced live results (up to 10), each showing brand, name, image, starting price, and variant count, with a loading skeleton.
4. Submitting (Enter or "search all") navigates to the shop search-results page, saves the term to recent searches, and closes the overlay.
5. **Conditional (no hits):** a "no results" state with the option to search all products.
6. **Limit:** search text is capped at 100 characters.

### 3.3 Live chat launcher

- A floating "Ask us!" button sits bottom-right on every page **except** checkout and sign-in.
- **Conditional (chat disabled by admin):** the launcher is hidden; if the widget is opened while disabled it shows an offline message and a WhatsApp link.
- **Conditional (unread replies):** a badge appears on the launcher (capped at "9+").
- **Conditional (proactive nudge enabled):** after a configured number of idle minutes on a page, a context-aware teaser appears beside the launcher — once per session per page context, and dismissible.
- **Conditional (on a product page):** opening chat can pre-fill the first message subject with the current product.

### 3.4 Home page

The static layout paints immediately; data-bound blocks stream in independently with skeletons. Section order (same on mobile and desktop; layout differs):

1. **Hero** — a pill listing up to 3 active category labels (or "Shop every category" if none), an animated headline with a rotating band of trending product names, a "Visit store" call-to-action to the first active category, and a scroll cue to the process section. On mobile the hero fills the viewport minus the header and tab bar.
2. **Browse by category** — a featured subset of categories as cards (icon, label, description, optional bullets). *Conditional (active):* the card links to that category's shop and reads "Browse {category}". *Conditional (inactive):* the card is not linked, shows a "Soon" badge and a non-functional "Notify me" label. *Conditional (more categories than the featured cap):* a "Browse all categories" link to the shop index.
3. **How it works** — three flows: *Store* (sourcing, inspect, grade, tag), *Order* (pick, pay, proof, dispatch), *Return* (money-back, warranty, service, exclusions). The copy uses the admin-configured money-back days and bank-transfer discount percent.
4. **How we grade** (dark band) — a headline, category tabs when more than one category has grades, and per-grade cards (badge, notes, optional video), plus a link to the inspection process. *Conditional (grade data fails to load):* the copy still shows; the grade grid is empty.
5. **Visit store** — address, opening hours, an embedded map and Maps link, accepted-payment pills from settings, and a delivery blurb (nationwide; same-day in-city; 1–3 days nationwide). On mobile the map sits above the details; on desktop they sit side by side.

### 3.5 Shop, listings, filters & deals

**Shop index (`/shop`).** *Conditional (no search query):* redirects to the first active category in catalog order. *Conditional (no active categories or a load failure):* redirects home. *Conditional (a search query is present):* renders the global search-results page instead of redirecting.

**Global search results.** A "Results for …" heading and a product grid with infinite scroll, sorted newest first. Shows a results-count bar when there are hits, a dashed empty state with "Browse all products" when empty, and degrades to an empty grid on load failure. Fetches 24 products per page.

**Category listing (`/shop/{category}`).** *Conditional (unknown category):* 404. *Conditional (category exists but inactive):* a "Coming soon" page with the description and a link to other shops (no grid). *Conditional (active):* the full listing experience.

- **Layout:** desktop shows a sticky left filter sidebar, a category rail, and the grid; mobile shows a category picker, a "Filters" button that opens a bottom sheet, and the grid.
- **Category switching:** the rail/picker lists all categories; inactive ones appear disabled ("Soon") and are not navigable; switching categories does not preserve filters unless they are in the URL.

**Filters (combine with AND logic; every active filter is reflected in the URL for sharing/bookmarking; changing any filter resets paging to the first page):**

| Filter | Meaning |
|---|---|
| Brand | One or more brand slugs (multi-select) |
| Grade | One or more grade slugs (multi-select) |
| Price min / max | Rupee range; digits only; requires an explicit "Apply" (does not auto-apply on blur) |
| Attribute facets | One or more values per admin-defined attribute; facet options load dynamically from the current filter set |
| In-stock only | Restrict to in-stock items (when used) |
| Sort | Newest (default), price ascending, price descending, name A–Z |
| Page | Deep-link to the furthest-loaded page |
| Query | Text search within the listing context |

- Grade and brand options show product counts; zero-count options are hidden unless already selected. Attribute facets update as other filters change, and dependent attributes clear when their parent changes.
- **Conditional (no facet options remain after filtering):** a message to adjust or clear filters.
- **Mobile sheet** has "Clear all" and "Show results" (which closes the sheet); **desktop** shows "Clear all filters" whenever any filter is active.

**Product grid & infinite scroll.** Loads 24 items per page. The next page auto-loads when a sentinel nears the viewport (roughly 600px ahead) or when the user taps "Load more". *Conditional (load error):* the button becomes "Retry". *Conditional (all pages loaded):* "You've reached the end." The furthest-loaded page is written to the URL via history replacement (no full navigation). Changing a filter resets the accumulated list to the server's first page.

**Empty states.** *Conditional (filters active, no matches):* "No more products match your selection" plus clear-filters. *Conditional (no filters, nothing in stock):* "No {category} in stock right now." *Conditional (listing load failure):* an empty grid rather than a hard error.

**Product cards.** Show brand, model name, hero image, grade badge, and attribute chips (title row and/or image overlay per the attribute's card position). *Conditional (multiple grades):* the card can cycle grade slides on hover/focus and shows "N grades available". *Conditional (out of stock / no variants):* a "Sold out" or "Unavailable" overlay. *Conditional (an active offer matches the card's variant):* an offer-title badge. Tapping a card opens the product page with the right grade/variant pre-selected in the URL.

**Deals page (`/deals`).** A static hero ("Today's deals", with copy about weekly drops, bundles, and the bank-transfer discount). An **active offers** section streams in and is hidden entirely when there are no live offers (mobile shows list rows with a discount chip, title, and optional expiry; desktop shows large offer cards). A **products on sale** section shows a grid of admin-featured products with infinite scroll and a count in the header. *Conditional (no sale products):* "No active deals right now — fresh ones every Friday." *Conditional (section load failure):* an empty, build-safe layout.

### 3.6 Product detail page (PDP)

**URL & routing.** The path is `/shop/{category}/{product-slug}`. The variant configuration is encoded in query parameters per attribute slug (not the legacy `?variant=id`). *Conditional (product slug unknown):* 404. *Conditional (category in URL does not match product's category):* redirects to the canonical URL. *Conditional (legacy variant ID in URL):* a one-time redirect to readable attribute params. *Conditional (invalid attribute combination in URL):* the client silently resets to default variant params (no error banner).

**Page structure.** Desktop shows breadcrumbs, a two-column layout (gallery | configurator), a grade showcase, and a "More from {brand}" rail (up to 4 items). Mobile shows a gallery card, the configurator, the grade showcase, the related rail, and a sticky bottom purchase bar above the tab bar.

**Image gallery.** A hero image at detail resolution, a thumbnail strip, and a lightbox on tap/zoom. Mobile supports swipe left/right and cross-fades. Images follow the selected variant when variant-specific images exist.

**Variant configurator.** "Build your configuration" — one row per dimension (grade, storage, color, etc.). The user picks each attribute independently; the selection syncs to the URL. *Conditional (incomplete selection):* the price is hidden, and a prompt lists the missing attributes (a desktop block and a mobile sticky placeholder). *Conditional (complete selection):* the price, stock, quantity stepper, and add-to-cart button appear.

**Closest-match behavior.** *Conditional (a complete selection is made but no exact variant exists):* the closest stocked variant is auto-selected, and a notice appears with a WhatsApp button pre-filled to inquire about the exact combination.

**Stock & quantity.** The variant is in stock when quantity > 0. The stock label reads "N in stock" (or "M available to add" if some are already in the cart). The quantity stepper maxes out at the remaining stock minus the cart quantity for that variant. *Conditional (stock > 1 and quantity < max):* a "Buy all (N)" shortcut sets the quantity to max. *Conditional (sold out):* the button is disabled ("Sold out"); the mobile sticky bar shows a sold-out state (and omits the WhatsApp button in the sold-out-only state, as desktop has no add button).

**Pricing & offers.** Shows the unit price. *Conditional (an offer applies):* shows a strikethrough original price, the discounted price, and an offer-title badge. Offers are loaded client-side and evaluated per selected variant. The shell may show cached prices briefly before the live price/stock block streams in.

**Add to cart.** Requires a complete selection, in-stock status, a hero image, and quantity > 0. *Conditional (the cart is at the maximum of 20 distinct lines):* a toast says "Cart is full" and the add is rejected. *Conditional (success):* a toast says "{name} added to cart" and the button briefly shows "Added" (~1.5s). The quantity per line is capped at stock (or a default of 10 if there is no stock cap). The mobile sticky bar also includes a WhatsApp inquiry button that opens an external chat with a pre-filled order message.

**Grade showcase.** Sits below the configurator and updates with the selected variant's grade. Shows the grade label, notes/bullets, the warranty for that unit, a mention of the 15-day money-back policy, and an optional inspection video embed (or a placeholder "REC" frame). *Conditional (grade data missing):* the section is omitted.

**Related products.** Shows products from the same category and brand, excluding the current product. *Conditional (none):* "No more products from {brand} right now."

**Chat integration.** The page registers the product context for the chat nudge and pre-fills the first-message subject.

### 3.7 Cart

**Persistence.** The cart is stored in browser local storage, survives a refresh, and syncs across tabs via storage events. *Conditional (SSR / before hydration):* an empty flash is avoided via a hydration gate (blank or skeleton until loaded). Corrupt storage entries are dropped and malformed lines removed.

**Limits.** Maximum **20 distinct line items** (product + variant pairs). Maximum **10 units per line** unless variant stock is lower (then stock is the cap). Adding the same variant increments the quantity up to the cap.

**Cart dropdown (desktop).** Opens from the header via an overlay and focus trap; Escape closes. *Conditional (empty):* an icon, a message, and a link to the shop. *Conditional (items):* lines with an image, brand, name, attribute chips, quantity stepper, line total, and remove control. Removing an item triggers a brief animation then a toast. The summary shows the subtotal, offer discounts, and the total (noting that delivery, payment discount, and loyalty apply at checkout). Links to view the full cart page or proceed to checkout.

**Full cart page (`/cart`).** Mobile shows a scrollable line list and a fixed bottom summary. Desktop shows a two-column list and a summary sidebar. Same line/summary behavior as the dropdown; offer discounts appear per line and in the total. *Conditional (loyalty blocked by active offers):* a summary footnote says loyalty is disabled for these offers.

**Line item links.** Tapping a product returns to the PDP with the exact grade/attributes restored in the URL.

### 3.8 Checkout

**Entry guards.** *Conditional (empty cart):* an empty cart state with a link to the shop. *Conditional (guest — not signed in):* a sign-in required panel only; the order summary preview sits on the side (read-only, "Sign in to place this order"; the place button is disabled).

**Signed-in checkout flow:**

- **Step 01 — Contact:** Full name (editable, min 2 chars) and WhatsApp number (read-only from the verified account).
- **Step 02 — Delivery:**
  - *Pickup (default):* Free; shows store address and hours.
  - *Delivery:* A flat Rs 1,500 fee unless the subtotal ≥ the admin free-delivery threshold, in which case it is free. *Conditional (delivery selected):* a single "Delivery address" field is required (min 2 chars, free text for house/street/area/city). Pre-fills the default saved address street if the customer has addresses.
- **Step 03 — Payment:** Tiles for enabled methods from store settings (bank transfer, Easypaisa, JazzCash, COD). *Conditional (bank transfer):* shows the admin-configured discount percent tag on the tile. The default selection is bank transfer.
- **Step 04 — Loyalty (sidebar):** *Conditional (balance > 0):* the loyalty panel is shown. *Conditional (an active offer disallows loyalty):* a message states points cannot be redeemed on this order; the toggle is unavailable. *Conditional (balance < minimum redeem of 100 points):* a message states the need for at least 100 points and explains the cap (20% of order max). *Conditional (eligible):* a toggle automatically applies the maximum redeemable points for this order (no partial manual entry). Points are worth Rs 1 each. The loyalty balance is looked up on load for the signed-in phone; it is non-fatal if the lookup fails.

**Order summary.** Shows the subtotal (pre-offer), offers discount, bank transfer discount (if bank payment), delivery line, loyalty redemption, and total. Shows projected points to earn on the final total (using the earn rate from store settings). A checkbox to agree to the 15-day money-back and return policy is required.

**Placement.** The "Place order" button is disabled until: the cart is non-empty, name > 1 char, phone ≥ 7 chars, address is valid if delivery, and the checkbox is checked. *Conditional (placing):* the button shows "Placing order…" and fields are disabled. An idempotency key prevents duplicate orders on retry or double-click. *Conditional (API error):* an inline error banner appears; the cart is retained. *Conditional (network error):* a generic network message. *Conditional (success):* the cart is cleared and the user redirects to the success page with the order number.

**Server-side placement rules.** Prices are re-fetched from the catalog at placement (client prices are ignored). Stock is reserved at placement; insufficient stock throws an error. Limits: max 20 lines, 1–10 quantity per line. There is a rate limit on placements per customer/window.

### 3.9 Checkout success

Requires a valid customer session; an invalid session triggers a sign-out flow. Requires an `order` query parameter with the order number; missing/invalid redirects to the account orders section. Loads the order from the account (not just URL totals).

**Display.** A success icon and "Thank you, your order is in." An order number card and timeline expectations (verify payment, QC, dispatch, delivery). *Conditional (payment + total > 0):* a payment instructions card (steps, account numbers, copy buttons, WhatsApp help). *Conditional (points earned and/or redeemed):* a loyalty summary card. Actions: view order detail, keep shopping.

### 3.10 Account & authentication

**Sign-in (`/account/sign-in`).**
1. The user enters a WhatsApp phone number.
2. Taps send → an OTP is issued (the display shows the last digits of the phone on success).
3. Enters the fixed-length OTP (auto-submits when complete).
4. Resend is available after a 30s cooldown.
5. *Conditional (rate limited):* error plus retry-after from the server.
6. *Conditional (OTP delivery server error ≥500):* fallback path: "I have a code from our team" plus contact WhatsApp/phone.
7. *Conditional (invalid OTP):* "That code didn't match."
8. *Conditional (success):* a session is created; redirects to the `next` param if it is a safe same-origin path, else to the account home.

**Account home (`/account`).** Requires sign-in. *Conditional (no/invalid session or deleted customer):* redirects through sign-out to sign-in.
- **Dashboard:** Greeting with first name; member since year; sign-out button. Stats: active orders, all-time orders, total spent (links to orders section where applicable). Order history with filters: All, Active, Delivered, Cancelled (counts on chips). *Conditional (empty filter):* context-specific empty message; All → browse shop; other filters → clear filter.
- **Order rows:** Order number, date, status badge, first item summary, delivery/pickup hint, total. Tap → order detail.
- **Loyalty sidebar:** *Conditional (loyalty member):* balance, rupee equivalent, lifetime earned, pending-from-shipping if any. *Conditional (not enrolled):* "Join Loyalty Points — ask at checkout."
- **Profile card:** Name, phone, default address preview or "none yet". Edit profile link.

**Profile (`/account/profile`).** Edit name and city (phone is read-only and verified). Save requires a non-empty name and city. Saved addresses: list, add, edit, remove, make default. *Conditional (remove last address):* remove is disabled when only one address exists. *Conditional (remove):* confirm step before delete. The address editor requires: recipient name, phone, street, city; area and postcode are optional. The first new address is auto-defaulted.

**Order detail (`/account/orders/{orderNumber}`).** Status badge, timeline, line items, totals, delivery/pickup, payment method. *Conditional (pending payment):* payment instructions are prominent. WhatsApp support link; loyalty points earned/redeemed if applicable. Back link to orders list.

**Sign-out.** Clears the session, anonymous chat cookies, the local cart, and the client signed-in flag. Redirects to the `to` param if safe, else sign-in. The button shows loading while navigating.

### 3.11 Live chat widget

**Modes:** Loading (initial bootstrap), Disabled (admin disabled chat), Compose (no conversation yet), Starting (first message sending; shows optimistic bubble + optional typing indicator), Thread (active conversation).

**One conversation per visitor.** There is no thread list; it opens the existing thread or compose.

**Guest vs signed-in:**
- *Welcome copy:* Guest welcome vs Customer welcome.
- *Thread creation:* Anonymous thread (optional product subject) vs Customer thread.
- *Message limit:* Guest preview limit (default 5 customer messages) vs Unlimited.
- *After limit:* Composer replaced with sign-in gate.
- *Sign-in merge:* A guest thread may merge into the customer thread on sign-in.

**Compose (first message).** Welcome card; optional "About: {product}" if opened from a PDP. Guest footer: preview note + sign-in link. Send creates the thread + sends the message; transitions to thread view.

**Thread view.** Messages are grouped by day; scrolling up loads older pages. Customer messages are instant; assistant messages are revealed with human-paced typing (when the assistant is enabled).
- *Conditional (assistant enabled):* typing indicator between bot bubbles; footer hint: type "speak to someone" for a human.
- *Conditional (assistant disabled):* "Teammate will reply" subtitle; no bot typing pacing.
- *Conditional (guest near limit):* warning when ≤2 preview messages remain.
- *Conditional (login required):* sign-in gate replaces composer.
- *Polling:* faster when the tab is focused, slower when blurred; immediate poll on tab visible.
- *Conditional (new reply while tab hidden):* document title is prefixed with a new message indicator.
- *Conditional (reconnecting):* subtitle "Reconnecting…"

**Auto-replies (assistant).** When enabled and configured, AI may reply after customer messages. Human escalation phrases mute the assistant for a grace period (~3 minutes); if no human reply after grace, the assistant may resume with reassurance-only messages. Unsafe replies are filtered; fallback templates are used. The customer can request a human explicitly.

**Errors.** Bootstrap/send failures show an error strip; a failed optimistic send is removed from the thread.

### 3.12 Loyalty program (customer view)

**Earning.**
- *Purchases:* Floor(subtotal × earn%) points on the completed order total (rate from store settings, commonly ~1%). Points are credited when the order reaches **delivered** (not at placement).
- *Reviews:* Bonus points after a delivery review (amount from settings).
- *Referrals:* Bonus to both parties when a friend's first order ships (amount from settings).
- The account may show **pending** points tied to the shipping state.

**Display.** Program name: "Loyalty Points". 1 point = Rs 1 redemption value. The account card shows balance, worth in rupees, lifetime earned, and pending if any.

**Redemption (checkout).** Minimum **100 points** to redeem. Maximum **20% of order subtotal** (after offers, before bank discount/delivery). Auto-applies the max allowed when the toggle is on (not arbitrary amount entry). *Conditional (active promotional offer blocks loyalty):* redemption is disabled; balance untouched. Redeemed at placement; refunded if order creation fails.

**Enrollment.** Not automatic in UI — non-members see "ask at checkout to enrol."

### 3.13 Offers & discounts (customer experience)

**Types of discount surfacing:**
1. *Promotional offers (admin campaigns)* — percentage or fixed off matched items or cart total; may include a free shipping action.
2. *Bank transfer discount* — percent off order subtotal when bank payment is selected at checkout (store setting).
3. *Featured / on-sale products* — deals page "Products on sale" list.

**Where offers appear:** Deals page (offer cards + featured product grid), Product cards (offer badge when variant matches), PDP (strikethrough + discounted price + offer title), Cart & checkout (line-level and cart-level discount rows in summary).

**Stacking rules (customer-visible effect).** Offers apply in admin sort order. *Conditional (non-stackable offer applied):* later offers are skipped. *Conditional (offer disallows loyalty):* loyalty redemption is hidden/disabled for that checkout. Exhausted or outside-schedule offers are ignored silently.

**Bank transfer.** Advertised on the home hero trust, deals copy, checkout payment tile, and order success instructions. The discount is shown in the checkout summary only when bank payment is selected.

**Free delivery.** Subtotal ≥ free-delivery threshold → delivery fee Rs 0. Otherwise courier delivery is Rs 1,500 flat. Pickup is always free.

---

## 4. Admin Console

### 4.1 Global patterns (all authenticated areas)

- **Session gate:** Every page except login/forgot/reset requires an active operator session. Inactive or deleted users are rejected on the server even if a cookie exists.
- **Page vs action permissions:** Missing page permission redirects to the dashboard with an "access denied" toast. Missing action permission shows read-only UI or hides controls; APIs return forbidden.
- **Super-admin:** Operators flagged as super-admin implicitly hold every permission key.
- **Permission inheritance:** `inquiry_manage` also grants view + reply; `inquiry_reply` also grants view.
- **Workspace layout:** List + detail split on desktop; mobile shows list OR detail. Deep links via URL params (order, customer, inquiry, team member, etc.).
- **Infinite scroll:** Orders, customers, inquiries load more pages as the operator scrolls.
- **Search:** Debounced text search syncs to the URL and refetches the list.
- **Activity logging:** Most mutations append an audit entry (actor, action, resource, optional detail). Failures in logging never block the business operation.
- **Sidebar / mobile hub:** Nav items are hidden without the matching permission. Badges on Orders, Customers, Inquiries show unseen/new counts where applicable.

### 4.2 Login & session

**Sign in.** Operator enters email + password on a standalone login screen. *Conditional:* Invalid credentials show the same generic message (no hint whether email or password failed). *Conditional:* After login, redirect to `callbackUrl` only if it is a same-origin path starting with `/` (prevents open redirects). *Effect:* Successful login establishes a session cookie; inactive users cannot authenticate.

**Forgot password.** Operator submits email. *Conditional:* Rate-limited per IP + email; excess attempts return "too many requests." *Conditional:* Response is always success-shaped whether or not the email exists (anti-enumeration). *Effect:* For active users, a one-hour reset token is stored hashed; the reset link is logged server-side (email not wired — operator must obtain link from logs in dev).

**Reset password.** Operator opens link with `token` query param. *Conditional:* Missing token → "invalid link" with a link to request a new one. *Conditional:* Password must meet validation rules (minimum 8 characters in UI hint; server enforces full password policy). *Conditional:* Expired/invalid token → error; rate-limited per IP. *Effect:* On success, password updated, reset token cleared, operator can sign in.

**Operator account (personal settings).** Separate "Account" area: edit own name, email, optional phone; change password (confirm match). Role shown read-only. *Permission:* Any authenticated operator. *Effect:* Profile update refreshes session display name/email.

### 4.3 Dashboard (Overview)

**Who sees what.** *Permission:* Dashboard home is available to all authenticated operators. *Permission:* "Latest orders" block only if `order_view`. *Permission:* "Latest activity" only if `activity_view`. Quick links / hub rows respect the same nav permissions as the sidebar.

**Mobile layout.** Welcome header. **Jump to** hub: Sales (Orders with pending count, Inquiries, Customers), Catalog (Products with low-stock or listed count, Categories, Offers), System (Activity, Settings, Team). **Today:** Orders count, Sales (PKR compact), Pending payments, Confirmed payments — each with % change vs yesterday where applicable. **This month:** Orders, Revenue, Customers, Loyalty members — with month-over-month % where applicable. **Shop health** card. **Recent inquiries** (up to 5): customer, status, unread badge or time ago; tap opens inquiry.

**Desktop layout.** **Hero:** Today's date, Sales today, Orders today, Pending payments (with day-over-day % on sales/orders). **Performance** (period selector): Range (Today | This week | This month | This year), Compare (Previous period | Same period last year), KPIs (Orders in range, Sales in range, Average order value, Days with orders), Revenue trend chart (Last 30 days daily revenue, total, peak day, active days count). **What needs your attention:** Pending payments, Confirmed payments, Dispatched, Refunds this month. **Stock & inbox:** Units in stock, Low stock alerts (threshold from settings), Models listed (+ units sold this month hint), Open inquiries (vs last week %). **Quick insights column:** Shop health + recent inquiries (4). **Latest orders** (5) if permitted. **Latest activity** (6) if permitted.

**Shop health card.** *Conditional:* Empty checks → congratulatory "all clear." Checks may include (sorted error → warn → info): Default/unset site name, No support phone or WhatsApp, No payment methods enabled, Bank/Easypaisa/JazzCash enabled but missing account details, Invalid marketing pixel ID formats, No active products, Products without images / without variants, Featured products that are archived, Variants out of stock / low stock. Each row links to the relevant fix area.

**Access denied banner.** *Conditional:* `?access=denied` on dashboard → toast "no permission," param stripped from URL.

**Loading / empty.** Each KPI/chart section has its own skeleton; sections stream in independently. Recent lists: "No orders/inquiries/activity yet" empty states.

### 4.4 Orders workspace

**List & filters.** *Permission:* `order_view` for page; sidebar badge for unseen orders. *Layout:* Desktop — status sidebar + searchable list + detail panel. Mobile — list OR detail. *Status filters:* All | Pending payment | Confirmed | Packed | Dispatched | Delivered | Cancelled | Refunded | Returned. *Deferred counts:* Total orders, per-status counts, pending count, net revenue (loads after first paint). *Search:* Order number, customer name, phone, city. *Conditional:* Empty list — generic vs "no matches" when searching. *Effect:* Opening an order marks it seen (clears "new" badge for that order).

**Order statuses (canonical set).** `pending-payment` → `confirmed` → `packed` → `dispatched` → `delivered`. Terminal / exception: `cancelled`, `refunded`, `returned`.

**Status stepper (detail panel).** *Permission:* `order_update` to change status; otherwise read-only banner. *Happy-path stepper:* Shows five forward steps; past steps styled complete; next step pulsed as suggested action. *Click rules (UI):* Can click current step, next step, or previous step only if current index < 3 (before dispatched) — i.e. can step back only before dispatched/delivered. *Other actions row:* Cancelled, Refunded, Returned buttons always available when permitted. *Server rule:* Cannot move status backward once order is dispatched or delivered (on happy path). *Packed rule:* Moving to `packed` requires a dispatch video URL (upload or paste). UI blocks pack without video; server rejects pack without video.

**Dispatch video.** Shown when status is `packed`. Upload targets order dispatch subject; saving video can auto-set status to packed. *Effect:* Video URL stored on order; customer-facing order detail can show fulfillment proof.

**Edit order.** *Permission:* `order_update`. *Conditional:* Edit button only when status is `pending-payment`. *Editable:* Line items (product/variant, qty, unit price), delivery address, payment method (bank-transfer, easypaisa, jazzcash, cod), delivery (courier, pickup). *Conditional:* Server rejects detail edits once status is past pending-payment. *Effect on item edit:* Stock reservation swapped atomically — new lines reserved first; failure = "not enough stock," old reservation kept.

**Footer actions.** *Print invoice:* Opens printable invoice in new tab (`order_update`). *WhatsApp customer:* Opens WhatsApp to customer phone. *View customer:* Link to customer workspace if linked. *Cancel order:* Confirm dialog; only if status not in cancelled/refunded/returned/delivered. *Permission:* Uses `order_update` (status → cancelled), not a separate cancel permission in UI. *Effect:* See lifecycle effects below.

**Hard delete order.** *Permission:* `order_delete` (owners / super-admins only in default role matrix). *Effect:* If not already cancelled/refunded, runs cancel side-effects first, then deletes record.

**Order lifecycle side effects.**
- *Placement (storefront):* Stock reserved (`inventoryReserved`). Points calculated, not credited yet.
- *→ `cancelled`, `refunded`, `returned`:* Releases reserved stock once (gated flag). Reverses earned points only if previously `delivered` and only for `cancelled`/`refunded` (not `returned`).
- *→ `delivered`:* No release. Credits `pointsEarned` to loyalty account (creates account if needed).
- *Effect:* Status change writes timeline entry; activity log `status_changed` or `updated`; dashboard caches invalidated.
- *Customer impact:* Status visible on storefront account order; payment instructions from settings; dispatch video when packed.

**Detail sections.** Customer snapshot, loyalty earned/redeemed on order. Delivery address, line items, subtotal/shipping/discount/total. *Timeline history:* Activity log entries for this order (admin actions).

**Loading / error.** Detail loading spinner; fetch failure toast + return to list.

### 4.5 Customers workspace

**List & segments.** *Permission:* `customer_view` page; `customer_update` to create; `customer_manage` for profile/notes/delete/addresses. *Segments:* All | Loyalty (enrolled) | With orders. *Counts:* Per segment + total loyalty balance (monetary equivalent using programme rupees-per-point). *Search:* Name, phone, city. *Conditional:* Empty — explains OTP sign-up / checkout origin vs no matches.

**Create customer (drawer).** *Permission:* `customer_update`. Fields: name, phone (sign-in ID), city optional, optional starter loyalty points (capped). Phone normalized to canonical national format; duplicate phone conflicts. *Effect:* Customer record created; optional loyalty account with bonus transaction; activity `created`.

**Detail panel tabs.** Overview, Profile, Addresses, Orders, Loyalty, Inquiries (if `inquiry_view`), Activity (if `activity_view`).

**Profile tab.** *Permission:* `customer_manage` to save. Editable: name, city, loyalty enrollment flag, internal notes. *Conditional:* Phone is read-only (storefront OTP identity). *Effect:* Activity `updated`; list refresh.

**Sign-in code.** *Permission:* `customer_update`. Generates numeric OTP valid 15 minutes; retires prior codes for that phone. *Effect:* Activity `signin_code_issued`; customer uses code on storefront login instead of SMS OTP.

**Delete customer.** *Permission:* `customer_manage`. *Conditional:* Blocked if `orderCount > 0` (button disabled + explanation). *Effect:* Hard delete; activity `deleted`; cannot delete if orders exist.

**Loyalty tab.** *Permission:* `loyalty_manage` OR `customer_manage` to adjust. Transaction kinds: Earn, Bonus, Redeem, Expire, Adjust (signed). Requires reason; optional order reference. *Conditional:* Redeem/expire/adjust negative blocked if insufficient balance. *Effect:* Balance/lifetime earned updated; transaction history; activity on loyalty resource.

**Addresses.** *Permission:* `customer_manage` to add/edit/delete saved addresses.

**Orders / Inquiries tabs.** Lists linked orders (link to orders workspace) and chat threads (link to inquiries). Inquiries matched by customer id or phone.

**Read-only mode.** *Conditional:* Without `customer_manage`, banner: view only — no profile/address/loyalty edits.

### 4.6 Inquiries inbox (storefront chat)

**Access.** *Permission:* `inquiry_view` page. *Permission:* `inquiry_reply` to send messages/attachments. *Permission:* `inquiry_manage` for status, assignee, internal notes, delete thread.

**Thread list.** Sorted by last message time; infinite scroll. Search: customer name, phone, product name, last message preview. Row shows: initials, name, preview, time, status pill, assignee label, unread count, escalation badge. *Conditional:* Only signed-in customer threads in main list (anonymous threads excluded from default filter).

**Open conversation.** Polls for new messages (faster when tab focused). Marks thread read for team (`unreadByTeam` → 0) on open. Loads older messages on scroll up. Message authors: customer, agent (human), assistant (AI) — distinct styling.

**Escalation.** *Conditional:* `escalated` flag shows "Needs senior" banner; assistant paused until human replies. *Effect:* Human reply clears escalation clock and unmutes assistant.

**Reply.** *Permission:* `inquiry_reply`. Text up to 4k chars; Enter sends, Shift+Enter newline. Attachments: JPEG, PNG, WebP, PDF, plain text. *Effect:* Message appended; `unreadByCustomer` incremented; if was `open` → `awaiting-customer`; if unassigned → auto-assign to replying operator; activity `updated` "Replied"; customer notification hook fired.

**Inquiry details (collapsible).** *Permission:* `inquiry_manage` to edit. Status: Open | Awaiting customer | Resolved. Assign to team member or Unassigned (needs `team_view` to populate list). Internal notes (team-only, not shown to customer). Delete thread with confirm. *Effect:* Status/assign/notes save → activity; delete → activity `deleted`, thread removed.

**Read-only reply bar.** *Conditional:* Without `inquiry_reply`, footer shows read-only notice.

**Call action.** Opens `tel:` link to customer phone.

### 4.7 Products

**Catalog list.** *Permission:* `product_view` page; create/update/delete gated separately. Category sidebar (including "Uncategorized" bucket). Filters: brand, grade (per category), stock state (no variants / all OOS / partial / fully stocked), live vs disabled, featured, has/missing photos. Table: image, name, brand, stock rollup, price range, SEO score, featured toggle, actions. *Permission:* `product_create` for wizard; `product_update` for edit/toggles; `product_delete` for delete.

**Live toggle (`isActive`).** *Permission:* `product_update`. *Effect:* Disabled products hidden from default catalog queries; not the same as archive.

**Delete vs archive.** *Delete permission:* `product_delete`. *Conditional:* Delete blocked if any order references the product — must disable or archive instead. *Archive (`isArchived`):* Supported at data layer and activity log; no dedicated archive control in catalog UI today — use disable or API-level archive when rebuilding. Default product list excludes archived items.

**Create wizard — Step 1: Details & photos.** *Permission:* `product_create`. Pick **category** (required) → unlocks brands for that category. Pick **brand** (required). **Name** (required, max 120) → shows predicted storefront URL slug. **Photos:** Shared gallery up to 8 images; required at least one valid image. Submit creates product **inactive** with empty variants. *Effect:* Proceed to Step 2.

**Create wizard — Step 2: Variants.** Organized by **grade** tabs for the category. Per variant: grade, price (non-negative integer rupees), quantity (stock), optional warranty days, **attributes** per category schema. Attributes may be single- or multi-select; visibility rules can hide attributes until parent selections made; custom attribute values need display labels. Duplicate combination signatures rejected. Can skip variants and finish later. *Effect:* Variants saved; product can be activated when ready.

**Edit drawer (existing products).** Same variant machinery as step 2 in "manage" mode. Edit shell: name, SEO, images, featured, structured content, etc. *Permission:* `product_update` / `product_delete` as above.

**Stock.** Quantity per variant drives in-stock / low-stock / OOS. Stock adjustments log activity. *Effect:* Storefront availability and cart reservation depend on variant quantity.

### 4.8 Categories, brands, grades & attributes

*Permission:* `category_manage` for entire workspace (also gates brands in nav). Single workspace with category sidebar.

**Categories.** Create/edit: label, slug, icon, sort order, active flag, structured marketing content, SEO. Preview panel for storefront appearance. Delete with confirm (cascade rules apply).

**Brands.** Scoped to a category; name, slug, image, sort, active. Used in product wizard brand picker.

**Grades.** Per category (e.g. condition tiers); label, slug, sort, active. Drives variant grouping in product editor.

**Attributes.** Per category: label, slug, unit, options (value + label), visibility rules (gated by brand/grade/other attribute values). Options can be colors, storage sizes, etc. *Effect:* Defines required fields on variants and storefront filters/facets.

**Views.** Table vs card view toggle. Search within category rows.

### 4.9 Offers & deals

*Permission:* `offer_manage` for page and all actions.

**List.** Filter: All | Live | Scheduled | Expired | Hidden. Search title, description, badge, discount label. Card shows: badge, discount label, title, computed status, action summary, condition count, schedule window, stackable/loyalty/usage pills, live toggle, edit/delete.

**Status logic (computed).** *Hidden:* `isActive` false. *Expired:* past `endDate`. *Scheduled:* before `startDate`. *Live:* active and within window.

**Create/edit wizard (3 steps).**
1. *Basics:* Title, slug, discount label, badge label, structured description, accent color, banner image, SEO, preview.
2. *Rules:* Conditions builder + action + schedule + constraints.
3. *Review/publish* (save).

**Conditions (types).** Specific product IDs, category slugs, brand slugs, grade slugs, attribute slug+value, price range, cart total. Operators: in/equals, not in, between, gte, lte.

**Actions.** Percentage discount, fixed amount discount (Rs), free shipping. Target: matched items only OR entire cart total.

**Schedule.** Start/end dates, days of week, daily start/end time.

**Constraints.** Stackable with other offers, allow loyalty points redemption, usage limit + count.

**Live toggle.** Flips `isActive` without opening drawer.

**Delete.** Confirm → removed from storefront deals page immediately.

**Pricing effect (storefront).** Active offers matching cart/line conditions apply discounts per action target; free shipping waives shipping when matched; constraints control stacking and loyalty redemption at checkout.

### 4.10 Team & roles

*Permission:* `team_view` page; `team_invite`, `team_update`, `team_remove` for actions.

**List.** Filter by role: All | Owner | Business manager | Product manager | Marketing manager | Support staff. Search name, email, phone, role label. Detail panel: overview, profile, access, password, activity (if `activity_view`).

**Invite drawer.** *Permission:* `team_invite`. Name, email, password, role, optional phone. *Effect:* User created; activity `invited`.

**Edit member.** *Permission:* `team_update`. Profile: name, email, phone. Access: role, active flag, super-admin flag. Set password (admin reset). *Conditional:* Cannot change own role, deactivate self, or revoke own super-admin. *Conditional:* Only super-admin can change roles or super-admin flag. *Effect:* Session cache invalidated for that user on change.

**Remove member.** *Permission:* `team_remove`. *Conditional:* Cannot remove self. *Conditional:* Cannot remove last super-admin. *Effect:* User deleted; activity `deleted`.

**Roles modal.** Read-only catalog of roles with descriptions and permission counts per role.

### 4.11 Activity log

*Permission:* `activity_view`. Feed of audit entries: actor name/role, action, resource type/label, detail text, timestamp. *Filters:* Resource type, action type, text search. *Actions tracked:* created, updated, deleted, archived, restored, status_changed, login, logout, invited, signin_code_issued. *Linked resources:* Click-through to relevant workspace. Also shown inline on order/customer/team detail panels (scoped to that resource).

### 4.12 Settings

*Permission:* `settings_view` page; `settings_update` to save (read-only banner otherwise). *Permission:* `data_cleanup` for cleanup tab (hidden without it).

**Tabs:**
- *Store details:* Site name, tagline — drives browser titles, chat, branding.
- *Contact:* Support phone, email, WhatsApp, physical outlet address.
- *Payments:* Enable/disable bank transfer, Easypaisa, JazzCash, COD; account numbers/IBAN.
- *Delivery:* Free-delivery threshold at checkout.
- *Notices:* Global delivery notes, store-wide banner alert.
- *Loyalty:* Earn rate (rupees per point), bonus points messaging.
- *Policies:* Money-back window, default warranty for product pages.
- *Inventory:* Low-stock alert threshold.
- *SEO:* Global meta defaults, OG image, organization structured data, checklist.
- *Chat widget:* Enable widget, idle nudge timing, guest message limit, cookie lifetime, AI assistant configuration, assistant test panel (`ai_view`).
- *Integrations:* Social links, Meta/GA4/GTM/TikTok pixels.
- *Data cleanup:* Typed-phrase bulk delete: all catalog, all orders, all inquiries, all customers.

**Save behavior.** Draft vs saved state per tab; discard/save footer on editable tabs. Chat and SEO use dedicated endpoints. *Effect:* Activity logged per settings group; storefront/checkout/chat immediately reflect changes.

---

## 5. Running locally

```bash
npm install
cp .env.example .env.local   # fill in the database URL and auth secret
npm run dev
```

The storefront and admin start side by side. The same `.env.local` is shared between them in development; in production each side has its own.
