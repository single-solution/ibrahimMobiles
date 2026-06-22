# Setup & Onboarding

Zero-to-running guide for the Ibrahim Mobiles Turborepo monorepo.

---

## Prerequisites

| Tool | Version |
| ---- | ------- |
| **Node.js** | **22+** (see `.node-version`) |
| **npm** | **10+** (bundled with Node; repo pins `npm@10.9.0`) |
| **Git** | Any recent version |
| **MongoDB** | Atlas cluster or local instance |

Optional for full production parity:

- Vercel Blob token (images and uploads)
- Twilio (customer OTP over WhatsApp/SMS)
- OpenAI or Google AI key (storefront chat assistant)

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

Edit `.env.local`. Minimum to boot locally:

| Variable | Required? | Purpose |
| -------- | --------- | ------- |
| `AUTH_SECRET` | **Yes** | Session encryption — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` | **Yes** | Storefront origin for Auth.js — `http://localhost:3000` in dev |
| `AUTH_TRUST_HOST` | **Yes** | `true` (proxy / Vercel) |
| `MONGODB_URI` | **Yes** | Connection string **including database name** in the path |
| `STORAGE_PROVIDER` | **Yes** | `vercel-blob` |
| `BLOB_READ_WRITE_TOKEN` | **Yes** for uploads | Vercel Dashboard → Storage |

Common optional variables:

| Variable | Purpose |
| -------- | ------- |
| `STOREFRONT_BASE_URL` | SEO/canonical fallback when Admin → Site URLs is empty |
| `ATLAS_SEARCH_ENABLED` | `false` to force regex search (local Mongo) |
| `MONGODB_SEARCH_INDEX` | Atlas Search index name (default `products_search`) |
| `OTP_PROVIDER` | `twilio` in production; unset in dev → OTP prints in server log |
| `TWILIO_*` | WhatsApp/SMS senders — see comments in `.env.example` |
| `OPENAI_API_KEY` / `GOOGLE_AI_API_KEY` | Chat assistant; omit for human-only chat |
| `DEV_SKIP_PUBLIC_DNS` | `true` if dev machine blocks `8.8.8.8` / `1.1.1.1` DNS fallback |

Full list with placeholders: [.env.example](../.env.example).

---

## 3. MongoDB

1. Create a database (e.g. `mobile-store`) in Atlas or locally.
2. Whitelist your IP (Atlas → Network Access).
3. Set `MONGODB_URI` to include that database name:

   `mongodb+srv://user:pass@cluster.mongodb.net/mobile-store?retryWrites=true&w=majority`

**Catalog data** is not shipped in the repo. Use Admin (`http://localhost:3001`) to create categories, attributes, grades, brands, and products — or restore from a database backup.

### Optional: Atlas Search

For ranked catalog search (shop overlay + chat assistant):

1. In Atlas → Search Indexes on the `products` collection, create an index named `products_search` (or match `MONGODB_SEARCH_INDEX`).
2. Leave `ATLAS_SEARCH_ENABLED` unset or `true`.

Without Atlas Search, set `ATLAS_SEARCH_ENABLED=false` — the app uses regex search automatically.

---

## 4. Run development servers

All apps (parallel):

```bash
npm run dev
```

Or individually:

```bash
npm run dev:web    # storefront → http://localhost:3000
npm run dev:admin  # admin      → http://localhost:3001
```

---

## 5. First-time operator checklist

After `npm run dev`:

1. **Admin sign-in** — use your team account (created directly in MongoDB or via invite flow if configured).
2. **Settings → Site URLs** — set the public storefront URL (production domain or `http://localhost:3000` for local SEO links).
3. **Settings → Store / Contact / Payments / Delivery** — fill operational copy used on About and Checkout.
4. **Catalog** — categories → grades → attributes → brands → products (see [catalog.md](catalog.md)).
5. **Upload test image** on a product — confirms `BLOB_READ_WRITE_TOKEN`.
6. **Storefront sign-in** — leave Twilio unset; OTP appears in the terminal running `@store/web`.

---

## 6. Quality commands

```bash
npm run lint       # ESLint across workspaces
npm run typecheck  # TypeScript --noEmit
npm run build      # Production build (all apps)
npm run format     # Prettier write
```

---

## Repository structure

```
ibrahimMobiles/
├── apps/
│   ├── web/          # Storefront (@store/web) — port 3000
│   └── admin/        # Admin console (@store/admin) — port 3001
├── packages/
│   ├── db/           # Mongoose models + connection
│   ├── shared/       # Domain logic, types, pricing, chat
│   └── ui/           # Shared React components
├── docs/             # This folder
├── README.md         # Business rules and domain specification
└── .env.example      # Environment template
```

There is **no** `tools/` seed or migration folder — catalog changes go through Admin.

Further reading:

- [Architecture](architecture.md)
- [Catalog operations](catalog.md)
- [README](../README.md) — storefront, checkout, orders, chat, loyalty

---

## Common issues / troubleshooting

### Auth errors or redirect loops

- **Cause:** Missing `AUTH_SECRET` or `AUTH_URL` does not match the storefront port.
- **Fix:** `AUTH_URL=http://localhost:3000`, valid 32-byte base64 `AUTH_SECRET`.

### Database connection fails

- **Cause:** Atlas IP block or missing database name in URI.
- **Fix:** Network Access in Atlas; URI path must end with `/your-db-name`.

### Admin shows `queryTxt EREFUSED` (SRV DNS)

- **Cause:** `mongodb+srv://` needs SRV lookups; flaky local DNS.
- **Fix:** Restart dev after pulling `packages/db` DNS fallback. Try macOS DNS `8.8.8.8` / `1.1.1.1`, Atlas **standard** connection string, or `DEV_SKIP_PUBLIC_DNS=true` when public DNS is blocked.

### `/_next/image` 500 / `ENOTFOUND …blob.vercel-storage.com`

- **Cause:** Server-side image optimizer cannot resolve Blob host.
- **Fix:** Fix DNS as above; admin dev serves Blob URLs directly for thumbnails.

### No OTP in dev

- **Expected** when `OTP_PROVIDER` and Twilio are unset.
- **Fix:** Read the `@store/web` terminal — the 6-digit code is logged there.

### Chat assistant silent

- **Cause:** No `OPENAI_API_KEY` or `GOOGLE_AI_API_KEY`.
- **Fix:** Add a key, or use human-only chat (team replies from Admin → Inquiries).

### Product not on storefront

- Walk the [visibility cascade](../README.md#visibility-cascade): active product, not archived, has variants, active category, active brand, in-stock variant (or force-out-of-stock handling).

### Search always feels “dumb” locally

- Set `ATLAS_SEARCH_ENABLED=false` explicitly, or create the Atlas Search index on a dev cluster.
