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

- Cloudflare R2 (or any S3-compatible) credentials (images and uploads)
- SMTP (admin password reset + staff email alerts)
- OpenAI or Google AI key (chat assistant)

**Not used on this deployment:** Meta WhatsApp Cloud, PayFast, Rapid Gateway. Checkout is bank transfer and/or COD; OTP codes print to server logs.

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

Production (configure in **Admin → Settings → Integrations** + deploy env):

| Area | Required for |
| ---- | ------------ |
| **SMTP** | Admin password reset + staff email alerts (Gmail / Google Workspace / any SMTP host) — set `SMTP_*` on Vercel |
| **Storage** | Cloudflare R2 (S3-compatible) uploads — set `AWS_S3_*` on Vercel |

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

Production (storefront `@store/web`): OTP codes print to server logs — no Meta WhatsApp env required.

Production (admin `@store/admin`):

| Variable | Required? | Purpose |
| -------- | --------- | ------- |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | **Yes** | Outbound email (Gmail / Workspace / any SMTP) |
| `ADMIN_SITE_URL` | **Yes** | Reset links and inquiry deep links — e.g. `https://admin.yourdomain.com` |
| `STAFF_NOTIFY_EMAIL` | Recommended | Extra staff inbox; **all active admin users** also receive email alerts |

Common optional:

| Variable | Purpose |
| -------- | ------- |
| `STOREFRONT_BASE_URL` | Canonical URL when Admin → Site URLs empty |
| `ATLAS_SEARCH_ENABLED` | `false` forces regex search |
| `MONGODB_SEARCH_INDEX` | Atlas index name (default `products_search`) |
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
| 3 | **Store / Contact / Payments / Delivery / Policies** — bank transfer + COD, COD %, policy HTML |
| 4 | **Catalog** — categories → grades → attributes → brands → products ([catalog.md](catalog.md)) |
| 5 | Upload test product image — confirms R2/S3 credentials |
| 6 | Storefront OTP sign-in — code in `@store/web` server logs |

---

## 6. Quality commands

```bash
npm run lint
npm run typecheck
npm run build
npm run format
```

**Production build:** `npm run build` may connect to MongoDB during static generation. Atlas should be reachable from CI, but SEO/metadata loaders and `SiteJsonLd` **fall back** when Mongo/`MONGODB_URI` is unavailable — the build should still complete. Prefer a stable connection so prerendered titles/OG tags use live admin settings. Set `MONGODB_URI` on the Vercel project for both **Build** and **Runtime** so production prerender uses live data.

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
| No OTP in logs | Request OTP then check `@store/web` / Vercel function logs | Look for the 6-digit code line |
| Chat assistant silent | No AI API key | Add key or use human-only (Admin → Inquiries) |
| Product missing on shop | Failed visibility cascade | [README § visibility](../README.md#1-catalog--domain-rules) |
| Weak local search | No Atlas index | Create index or set `ATLAS_SEARCH_ENABLED=false` |
| Production build fails prerender | Rare after SEO fallbacks; still check Atlas + CI allowlist | [go-live.md](go-live.md) |
| Card paid, order still pending | Webhook missing amount or bad secret | Gateway dashboard; admin manual confirm |
| No staff notifications | SMTP/WhatsApp/templates unset | Admin Integrations + Shop Health |
