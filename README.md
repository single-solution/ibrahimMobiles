# Ibrahim Mobile Store

An ecommerce store made of two connected experiences — a public **storefront** for customers and a private **admin dashboard** for staff.

The shop's identity (name, logo, contact details, social handles), its policies (warranty length, money-back window, free-delivery threshold, bank-transfer discount), and its operational rules (chat hours, loyalty earn rate) are **all editable from the admin** — nothing brand-specific is baked into the code. A re-brand or policy change is a settings save, not a release.

---

## What the storefront does

The storefront is what a customer sees. Anyone can browse without an account; signing in unlocks orders, the wishlist, saved addresses, and message history.

**Browsing & discovery**

- A homepage that opens with a hero gallery of the most recently listed products, then walks the visitor through how the shop sources, inspects, and grades stock.
- A shop section organised by category, with filtering by brand, grade, price, and any attribute the admin has defined for that category.
- A search bar that finds products by name, brand, or model.
- A product page with a photo carousel, full condition notes, variant picker (configurable per category), price, stock status, warranty term, and an "ask about this product" entry point into chat.

**Buying**

- A cart that survives navigation and refresh, with an inline drawer in the header and a full cart page.
- A checkout that asks for delivery method (pickup or courier), payment method (bank transfer, EasyPaisa, JazzCash, or cash on delivery), and a delivery address when needed.
- Bank transfer earns the admin-configured discount automatically; courier delivery is free above the admin-configured order total, otherwise a flat fee applies.
- Loyalty members can redeem points at checkout; non-members can sign up at the same time.
- On submit, the order is locked, the customer sees a confirmation page with payment instructions for the chosen method, and an order number they can quote on WhatsApp.

**After the sale**

- Every order shows up under the customer's account with its current status, a timeline of changes (placed → confirmed → dispatched → delivered), and a copy of the invoice details.
- Returns and warranty claims are handled via chat — the customer doesn't need to fill a separate form.

**Chat & support**

- A floating chat widget on every page. Guests can send a few preview messages before being asked to sign in; signed-in customers see their full history.
- Messages can include attachments (photos of a faulty unit, screenshots, PDFs).
- An assistant can auto-reply when staff are offline; staff take over when they're back.
- When a customer signs in after starting a guest thread, the thread is automatically linked to their account.

**Sign-in**

- One-time code by WhatsApp (with SMS fallback). No passwords for customers — the phone number is the identity.
- Sessions persist across browser restarts so a returning customer doesn't have to re-verify.

---

## What the admin does

The admin dashboard is invitation-only and intended for owners, managers, and staff. Each role sees only what it needs.

**Dashboard**

- Headline KPIs (revenue, orders, customers, low-stock alerts) with a date selector for the period you want to compare.
- Live activity feed of recent staff actions.
- Alerts surface things that need attention — stuck orders, unanswered inquiries, low inventory.

**Products & catalogue**

- Add or edit products with a guided two-step wizard (basics → variants).
- Per-variant pricing, stock count, condition grade, attribute values, and gallery images. Images are resized into multiple sizes and stored automatically; replacements clean up the old ones.
- Categories, brands, grades, and per-category attributes are admin-defined — adding a new grade or attribute does not need a code change.
- Each product, category, brand, and grade carries its own SEO panel (title, description, canonical, social card) with a live search-result preview.

**Orders**

- A searchable, paginated list with filters by status and date.
- An order detail panel that shows every line item, the customer snapshot, payment and delivery choice, totals breakdown, and a status timeline. Status changes are one click and write to the timeline automatically.
- Loyalty points are credited when an order is marked delivered, and stock is decremented when an order is confirmed — both happen exactly once per order regardless of retries.

**Customers**

- A directory with quick filters and search.
- A detail view per customer: contact info, saved addresses, order history, loyalty balance, and the full thread of inquiries they've sent.
- Loyalty members and balances are managed from this same view.

**Inquiries (chat)**

- A unified inbox of every conversation — guest threads, signed-in customer threads, and product-specific inquiries.
- Replies support text and attachments. Internal notes are visible to staff only.
- The header shows an unread badge so a busy day doesn't lose a customer to a missed message.

**Offers**

- Create banner offers with their own colour accent, slug, validity window, and SEO. Toggle active or inactive without deleting.

**Team**

- Invite new staff by email. Each invitation has a configurable role.
- Per-member detail panel showing their role, recent activity, and (for owners) the ability to update or revoke access.

**Settings**

- One place to edit the shop's name, logo, addresses, contact numbers, social links, payment instructions, loyalty earn rate, free-delivery threshold, bank-transfer discount, warranty months, money-back days, chat configuration, and SEO defaults.
- Changes take effect everywhere within the next minute — no redeploy.

---

## Communications

- **WhatsApp** is the primary delivery channel for one-time sign-in codes; SMS is an optional fallback. Setup notes: [docs/otp-setup.md](docs/otp-setup.md).
- **Chat** is in-app — both the customer's view (storefront floating widget) and the staff's view (admin inbox) read the same thread, so a reply on either side appears immediately on the other.
- **Order confirmations** show on-screen at checkout and persist on the order detail page. Customers can reply on WhatsApp using the order number; that conversation can be linked back inside the admin if needed.

---

## Roles and access

| Role | Sees |
|---|---|
| Customer | Storefront only — own orders, wishlist, addresses, chat threads. |
| Staff | Admin — products, orders, customers, chat. No team or destructive tools. |
| Manager | Staff capabilities + offers, settings, loyalty management. |
| Owner | Everything, including team invites and the data cleanup tools. |

Customer accounts and staff accounts are separate worlds — a customer cannot become an admin and an admin signing in as a customer creates an unrelated customer record.

---

## How a typical day flows

**A customer placing an order**

1. Lands on the homepage, browses a category, opens a product.
2. Picks a variant, adds to cart, opens checkout.
3. Signs in by entering their phone number and the code that arrives over WhatsApp.
4. Picks delivery and payment, enters an address if courier, places the order.
5. Sees the order confirmation with payment instructions, then watches the timeline update from their account as staff confirm and dispatch.

**A staff member handling the morning**

1. Opens the dashboard, sees the alert tile flagging two stuck orders and three unread inquiries.
2. Clicks an inquiry, replies with a photo of the requested unit, sets the thread to resolved.
3. Opens the stuck order, confirms payment, marks it confirmed — stock is decremented automatically.
4. Adds a new product through the wizard, uploads photos, publishes it.
5. Updates the bank-transfer discount in Settings ahead of a weekend sale.

---

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the database URL and auth secret
npm run dev
```

The storefront and admin start side by side. The same `.env.local` is shared between them in development; in production each side has its own.
