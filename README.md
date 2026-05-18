# Mobile Store Monorepo

A pre-owned mobile-phone storefront and admin dashboard — built as **two separate Next.js apps** living in one monorepo so each can be hosted, secured, and scaled independently.

The displayed brand name, contact info, social links, and policy thresholds (free-delivery cutoff, bank-transfer discount, warranty months, money-back window) are all **admin-managed settings** — edited from the admin's `Settings` page, persisted to MongoDB, and surfaced everywhere via `getStoreSettings()` (server) or the `useStoreSettings()` hook (client). The factory defaults live in `packages/shared/src/storeSettings.ts`; nothing brand-specific is hardcoded inside controllers, components, or routes.

---

## Why two apps?

The customer storefront and the staff admin dashboard have very different threat models:

- **Storefront**: public, customer-facing, customers stay logged in across browser restarts (30-day persistent cookie).
- **Admin**: invitation-only, staff-only, browser-session cookies that drop the moment the window closes — no exposure if a laptop is left unlocked.

Splitting them into two distinct deployments means:

- Different cookie names + (eventually) different hosts → admin cookies are unreachable from storefront JavaScript and vice versa.
- A stored XSS on the storefront cannot read or replay admin sessions.
- Admin can be IP-allowlisted / WAF-protected / fronted by a VPN at the platform layer without affecting customers.
- Each app ships only the code it actually needs — no admin route handlers in the customer bundle, no storefront pages in the admin bundle.

---

## Repo layout

```
mobile-store/
├── apps/
│   ├── web/              # @store/web   — storefront (port 3000)
│   └── admin/            # @store/admin — admin dashboard (port 3001)
│
├── packages/
│   ├── db/               # @store/db     — Mongoose models + connectDB + getStoreSettings + order-number generator
│   └── shared/           # @store/shared — logger, validation, rate-limit, phone helpers, types, loyalty config
│
├── package.json          # workspaces root + Turborepo scripts
├── turbo.json
├── tsconfig.base.json    # shared compiler options
└── .env.local            # symlinked into apps/web and apps/admin
```

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**
- **Auth.js v5** — separate NextAuth instance per app, distinct cookie names
- **MongoDB Atlas** + **Mongoose 9** (singleton connection in `@store/db`)
- **Turborepo 2** + **npm workspaces** — one install, parallel dev, per-app builds
- **Pino** structured logging, **bcryptjs** for password / OTP hashing
- **Twilio** (optional) for WhatsApp-first OTP delivery with SMS fallback

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI, AUTH_SECRET, etc.

# both apps in parallel
npm run dev
#   ▶ storefront — http://localhost:3000
#   ▶ admin      — http://localhost:3001

# or one at a time
npm run dev:web
npm run dev:admin
```

The root `.env.local` is symlinked into each app, so you maintain a single env file in dev. In production each app gets its own env vars on its own deployment.

---

## Building & deploying

```bash
npm run build           # builds both apps via Turborepo
npm run build:web       # storefront only
npm run build:admin     # admin only

npm run start:web       # production server on :3000
npm run start:admin     # production server on :3001
```

### On Vercel

Create **two Vercel projects** pointing at the same Git repo:

| Project    | Root Directory | Recommended domain                          |
| ---------- | -------------- | ------------------------------------------- |
| Storefront | `apps/web`     | your storefront domain                      |
| Admin      | `apps/admin`   | a private subdomain, e.g. `admin.<domain>` |

Vercel auto-detects npm workspaces and only redeploys the project whose code actually changed.

---

## Authentication summary

| Concern             | Storefront                     | Admin                              |
| ------------------- | ------------------------------ | ---------------------------------- |
| Provider            | Phone OTP (`customer-otp`)     | Email + password (`credentials`)   |
| Roles               | `customer` (only)              | `owner` / `manager` / `staff`      |
| Cookie name (prod)  | `__Secure-web.session-token`   | `__Secure-admin.session-token`     |
| Cookie lifetime     | 30 days, persistent            | Session-only (drops on browser close) |
| Sign-in page        | `/account/sign-in`             | `/login`                           |
| RBAC                | n/a — being a customer is the role | `lib/permissions.ts` server-side enforcement |

---

## Adding new functionality

- **Schema change?** Edit / add a model in `packages/db/src/models/`. Both apps pick it up on the next type-check.
- **Storefront-only feature?** Lives in `apps/web/src/`.
- **Admin-only feature?** Lives in `apps/admin/src/`.
- **Util used by both?** Goes in `packages/shared/src/` — keep it framework-light (no React, no admin/storefront imports).
- **Re-brand?** Sign in to admin → `Settings` → edit site name / contacts / social links / policies. Changes propagate within the `getStoreSettings()` cache TTL (60 seconds) — no redeploy needed. The factory defaults in `packages/shared/src/storeSettings.ts` only apply on a fresh install with no Setting documents yet.

---

## Useful commands

```bash
npm run typecheck   # both apps + packages
npm run lint        # both apps
npm run dev         # both dev servers in parallel
```
