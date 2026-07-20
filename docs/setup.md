# Setup & Onboarding

Zero-to-running guide for the Ibrahim Mobiles monorepo.

---

## Prerequisites

| Tool | Requirement |
| ---- | ----------- |
| **Node.js** | 22+ (see `.node-version`) |
| **npm** | 10+ |
| **Git** | Recent stable |
| **MongoDB** | Atlas cluster or local |

Optional for production parity:

- PayFast or Rapid Gateway (pay online)
- Cloudflare R2 (or any S3-compatible) credentials (images and uploads)
- Meta WhatsApp Cloud API (customer OTP + order/chat notifications)
- SMTP (admin password reset + staff email alerts)
- OpenAI or Google AI key (chat assistant)

---

## Boot sequence

```mermaid
flowchart TD
  CLONE[Clone + npm install] --> ENV[Copy .env.local]
  ENV --> MONGO[MongoDB URI + IP allowlist]
  MONGO --> DEV[npm run dev]
  DEV --> ADMIN[Admin :3001 sign-in]
  ADMIN --> SETTINGS[Fill settings tabs]
  SETTINGS --> CATALOG[Create catalog]
  CATALOG --> TEST[Storefront :3000 smoke test]
  TEST --> GOLIVE[go-live.md production checklist]
```

**Production launch:** follow [go-live.md](go-live.md) after local smoke test passes.

---

## 1. Clone and install

```bash
git clone <repository-url>
cd ibrahimMobiles
npm install
```

---

## 2. Environment variables

```bash
cp .env.example .env.local
```

Production (configure in **Admin → Settings → Integrations**):

| Area | Required for |
| ---- | ------------ |
| **PayFast / Rapid Gateway** | Pay online — pick one provider; webhooks `/api/webhooks/payfast` or `/api/webhooks/rapid-gateway` |
| **Meta WhatsApp** | Customer OTP sign-in |
| **SMTP** | Admin password reset + staff email alerts (Gmail / Google Workspace / any SMTP host) |
| **Storage** | Cloudflare R2 (S3-compatible) uploads |

Env vars in `.env.example` are bootstrap fallbacks only. `AUTH_*` and `MONGODB_URI` must stay on the host.

Minimum to boot locally:

| Variable | Required? | Purpose |
| -------- | --------- | ------- |
| `AUTH_SECRET` | **Yes** | Session encryption — `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` | **Yes** | App origin — `http://localhost:3000` (storefront) or `http://localhost:3001` (admin-only dev) |
| `AUTH_TRUST_HOST` | **Yes** | `true` |
| `MONGODB_URI` | **Yes** | Connection string **with database name** in path |
| `AWS_S3_BUCKET` / `AWS_S3_REGION` | **Yes** for uploads | S3-compatible bucket (Cloudflare R2: region `auto`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | **Yes** for uploads | R2/S3 API token credentials |
| `AWS_S3_ENDPOINT` | **Yes** for R2 | `https://<account-id>.r2.cloudflarestorage.com` (blank = native AWS S3) |
| `AWS_S3_PUBLIC_URL_BASE` | Optional | Public/CDN base URL for stored objects |

Production (storefront `@store/web`):

| Variable | Required? | Purpose |
| -------- | --------- | ------- |
| `OTP_PROVIDER` | **Yes** | `whatsapp-cloud` |
| `WHATSAPP_CLOUD_ACCESS_TOKEN` | **Yes** | Meta Business permanent token |
| `WHATSAPP_PHONE_NUMBER_ID` | **Yes** | Sender phone number ID |
| `WHATSAPP_OTP_TEMPLATE_NAME` | Recommended | Default `authentication` |

Production (admin `@store/admin`):

| Variable | Required? | Purpose |
| -------- | --------- | ------- |


| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | **Yes** | Outbound email (Gmail / Workspace / any SMTP) |
| `ADMIN_SITE_URL` | **Yes** | Reset links and inquiry deep links — e.g. `https://admin.yourdomain.com` |
| `STAFF_NOTIFY_EMAIL` | Recommended | Extra staff inbox; **all active admin users** also receive email alerts |
| `STAFF_NOTIFY_WHATSAPP` | Recommended | Global staff WhatsApp line for shop-wide alerts |
| `WHATSAPP_STAFF_NOTIFY_TEMPLATE` | Recommended | Meta utility template — staff order + chat alerts |
| `WHATSAPP_CUSTOMER_ORDER_TEMPLATE` | Recommended | Meta utility template — customer order placed, status updates, agent chat replies |

Common optional:

| Variable | Purpose |
| -------- | ------- |
| `STOREFRONT_BASE_URL` | Canonical URL when Admin → Site URLs empty |
| `ATLAS_SEARCH_ENABLED` | `false` forces regex search |
| `MONGODB_SEARCH_INDEX` | Atlas index name (default `products_search`) |
| `STAFF_NOTIFY_WHATSAPP` + `WHATSAPP_STAFF_NOTIFY_TEMPLATE` | Staff WhatsApp on orders + chat |
| `WHATSAPP_CUSTOMER_ORDER_TEMPLATE` | Customer WhatsApp on orders + agent replies |
| `OPENAI_API_KEY` / `GOOGLE_AI_API_KEY` / `ANTHROPIC_API_KEY` | Chat assistant |
| `MERCHANT_FEED_TOKEN` | Optional bearer for `GET /api/feeds/merchant` |
| `CRON_SECRET` | Bearer token for `GET /api/cron/seo-reconcile` (nightly SEO stats) |
| `AWS_S3_*` / `AWS_S3_ENDPOINT` | S3-compatible media storage (Cloudflare R2) |
| `DEV_SKIP_PUBLIC_DNS` | `true` if local DNS blocks public resolvers |

Full list: [.env.example](../.env.example).

---

## 3. MongoDB

1. Create database (e.g. `mobile-store`).
2. Whitelist IP in Atlas → Network Access.
3. URI includes database name:

   `mongodb+srv://user:pass@cluster.mongodb.net/mobile-store?retryWrites=true&w=majority`

**Catalog** is created in Admin or restored from backup — not bundled in the repo.

### Atlas Search (optional)

```mermaid
flowchart LR
  IDX[Create products_search index] --> ON[ATLAS_SEARCH_ENABLED true]
  ON --> RANK[Ranked shop + chat search]
  OFF[ATLAS_SEARCH_ENABLED false] --> REGEX[Regex search]
```

---

## 4. Run development servers

```bash
npm run dev          # both apps
npm run dev:web      # storefront → http://localhost:3000
npm run dev:admin    # admin      → http://localhost:3001
```

---

## 5. First-time operator checklist

| # | Task |
| - | ---- |
| 1 | Admin sign-in |
| 2 | **Settings → Site URLs** — public storefront URL |
| 3 | **Store / Contact / Payments / Delivery / Policies** — card+COD, COD %, policy HTML |
| 4 | **Catalog** — categories → grades → attributes → brands → products ([catalog.md](catalog.md)) |
| 5 | Upload test product image — confirms R2/S3 credentials |
| 6 | Storefront OTP sign-in — code in `@store/web` terminal when Meta WhatsApp env unset |

---

## 6. Quality commands

```bash
npm run lint
npm run typecheck
npm run build
npm run format
```

**Production build:** `npm run build` may connect to MongoDB during static generation. Atlas should be reachable from CI, but SEO/metadata loaders **fall back to factory defaults** when Mongo is down — the build should still complete. Prefer a stable connection so prerendered titles/OG tags use live admin settings.

Per-app builds:

```bash
npm run build --workspace=@store/web
npm run build --workspace=@store/admin
```

---

## 7. Go-live

Full production checklist — env vars, Admin Integrations, Shop Health, webhooks, smoke test:

**[go-live.md](go-live.md)**

---

## Repository structure

```
ibrahimMobiles/
├── apps/
│   ├── web/          # Storefront — port 3000
│   └── admin/        # Admin — port 3001
├── packages/
│   ├── db/           # Mongoose models
│   ├── shared/       # Domain logic
│   └── ui/           # Shared components
├── docs/
└── README.md         # Domain specification
```

---

## Further reading

- [Go-live runbook](go-live.md)
- [Architecture](architecture.md)
- [Catalog operations](catalog.md)
- [Engineering handbook](engineering-handbook.md) — standards, optimizations, rule gaps (read before new features)
- [Website audit guide](website-audit.md)
- [README](../README.md)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Auth redirect loop | Missing `AUTH_SECRET` or wrong `AUTH_URL` | Match port 3000 |
| DB connection fail | IP block or missing DB name in URI | Atlas Network Access |
| SRV DNS `EREFUSED` | Local DNS cannot resolve Atlas SRV | Standard connection string or `DEV_SKIP_PUBLIC_DNS=true` |
| Image 500 on R2 host (`ENOTFOUND` in terminal) | Browser resolves the R2 public host but Node could not — local DNS/router issue | Dev loads product images directly (pre-sized WebP). Fix DNS or set `DEV_SKIP_PUBLIC_DNS=false` (default). Restart `npm run dev` after `.env` changes. |
| No OTP in dev | Meta WhatsApp unset | Read `@store/web` terminal log |
| Chat assistant silent | No AI API key | Add key or use human-only (Admin → Inquiries) |
| Product missing on shop | Failed visibility cascade | [README § visibility](../README.md#1-catalog--domain-rules) |
| Weak local search | No Atlas index | Create index or set `ATLAS_SEARCH_ENABLED=false` |
| Production build fails prerender | Rare after SEO fallbacks; still check Atlas + CI allowlist | [go-live.md](go-live.md) |
| Card paid, order still pending | Webhook missing amount or bad secret | Gateway dashboard; admin manual confirm |
| No staff notifications | SMTP/WhatsApp/templates unset | Admin Integrations + Shop Health |
