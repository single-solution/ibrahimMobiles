# Architecture

Technical map of the Ibrahim Mobiles monorepo — how apps, packages, and MongoDB fit together.

---

## Stack

| Layer | Choice |
| ----- | ------ |
| Runtime | Node.js **22+** (see `.node-version`) |
| Monorepo | npm workspaces + **Turborepo** |
| Framework | **Next.js 16** (App Router), React 19 |
| Database | **MongoDB** via Mongoose (`packages/db`) |
| Auth | **Auth.js v5** — separate sessions for storefront customers and admin users |
| Storage | **Vercel Blob** (product images, offer art, chat attachments, grade videos) |
| Styling | Tailwind CSS v4 |
| AI chat | OpenAI or Google Gemini (optional; human-only chat without keys) |

---

## Applications

| App | Package | Port (dev) | Role |
| --- | ------- | ---------- | ---- |
| Storefront | `@store/web` | **3000** | Public shop, cart, checkout, customer account, live chat |
| Admin | `@store/admin` | **3001** | Catalog, orders, customers, offers, settings, team |

Both apps are Next.js deployments that import shared packages. They share one MongoDB database and one Blob store.

**Local URLs**

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3001`

Customer Auth.js callbacks use `AUTH_URL` (storefront origin). Admin has its own Auth.js config scoped to the admin app.

---

## Packages

| Package | Purpose |
| ------- | ------- |
| `@store/db` | Mongoose models, connection helper, inventory helpers, order number generation |
| `@store/shared` | Domain types, pricing/offer engine, attribute config resolution, formatters, validation, chat/SEO utilities |
| `@store/ui` | Shared UI primitives (buttons, selects, quantity stepper) |

**Import rule:** Apps import from `@store/db` and `@store/shared` barrels — avoid deep paths into package internals.

---

## MongoDB collections

| Collection | Domain |
| ---------- | ------ |
| `categories` | Top-level catalog groupings (phones, accessories, gadgets) |
| `brands` | Brands per category |
| `grades` | Condition tiers per category (brand-new, open-box, genuine-used, …) |
| `attributes` | Filter/config dimensions per category (storage, color, PTA, …) |
| `products` | Listings with gallery, attribute config, and embedded `variants[]` |
| `offers` | Promotional rules (conditions + actions) |
| `orders` | Checkout snapshots + lifecycle status |
| `customers` | Shopper profiles (phone identity, addresses) |
| `loyaltyaccounts` | Point balances and ledger |
| `inquiries` | Chat threads (customer ↔ team) |
| `users` | Admin team accounts |
| `settings` | Singleton store configuration document |
| `otp codes` | Short-lived customer sign-in codes |
| `activityentries` | Append-only admin audit log |

**Product document shape (high level)**

- Identity: `slug`, `name`, `categorySlug`, `brandSlug`, flags, `images[]`
- Attribute config: `attributeSlugs`, `attributeOptionPool`, `attributeCustomOptions`, optional `attributeDefaults`
- Inventory: `variants[]` — each with `_id`, `gradeSlug`, `priceRupees`, `quantity`, `forceOutOfStock`, `warrantyDays`, `attributes`, optional `attributeDisplay`

Timestamps: Mongoose `createdAt` / `updatedAt` on top-level documents. Variants do not have their own timestamps.

---

## Request and data boundaries

```mermaid
graph TB
  subgraph clients
    WEB[Storefront :3000]
    ADM[Admin :3001]
  end

  subgraph packages
    SH[@store/shared]
    DB[@store/db]
    UI[@store/ui]
  end

  subgraph external
    MONGO[(MongoDB)]
    BLOB[Vercel Blob]
    TWILIO[Twilio OTP]
    AI[OpenAI / Gemini]
  end

  WEB --> SH
  WEB --> DB
  WEB --> UI
  ADM --> SH
  ADM --> DB
  ADM --> UI
  DB --> MONGO
  WEB --> BLOB
  ADM --> BLOB
  WEB --> TWILIO
  WEB --> AI
  ADM --> AI
```

**Storefront API routes** (`apps/web/src/app/api/`) handle cart, checkout, orders, chat, and auth. Prices and stock are always re-validated server-side at placement.

**Admin API routes** (`apps/admin/src/app/api/`) enforce permission checks per handler. Catalog mutations write activity log entries (non-blocking).

**Serializers** live per app (`lib/serializers/`) — admin and storefront expose different DTO shapes for the same Mongo documents.

---

## Search

- **Shop listing / filters:** Mongo queries + compound indexes on `products`.
- **Global search overlay:** Atlas Search when `ATLAS_SEARCH_ENABLED` is not `false` and the `products_search` index exists; otherwise regex fallback (see [setup.md](setup.md)).
- **Chat assistant catalog tool:** Same Atlas Search path with automatic regex fallback.

---

## Indexes and maintenance

- Schema-declared compound indexes on `products` for category listings and admin sorts.
- Admin **Rebuild indexes** (`data_cleanup` permission) runs `createIndexes()` on all models — safe to re-run; does not drop indexes.
- **Atlas Search** indexes are created in the Atlas UI, not by the app.

---

## What is not in this repo

- No `tools/` or one-time seed/migration scripts — catalog is managed through Admin.
- No separate API server — Next.js route handlers are the API.
- No Redis or job queue — side effects are inline or fire-and-forget with swallowed errors (audit log, analytics).

For business rules (visibility, checkout, orders, loyalty), see the root [README.md](../README.md).
