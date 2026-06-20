# Setup & Onboarding

This is a Turborepo monorepo containing the Ibrahim Mobiles platform. This guide covers everything needed to get the project running locally.

## Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: Check `.node-version` or `.nvmrc` for the exact version (e.g., v20+).
- **npm**: Comes with Node.js.
- **Git**: For cloning the repository.
- **MongoDB**: A local instance or an Atlas cluster URL.

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ibrahimMobiles
```

### 2. Install Dependencies

Install all monorepo dependencies from the root:

```bash
npm install
```

### 3. Environment Variables

Copy the example environment file to create your local overrides:

```bash
cp .env.example .env.local
```

Fill in `.env.local` based on the table below.

| Variable Name | Required? | Purpose | Where to get it |
|---|---|---|---|
| `AUTH_SECRET` | **Yes** | Encrypts session cookies. | Run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_URL` | **Yes** | Base URL for Auth.js callbacks. | Use `http://localhost:3000` for local dev. |
| `AUTH_TRUST_HOST` | **Yes** | Trusts the host header (needed for proxies). | Set to `true`. |
| `STOREFRONT_BASE_URL` | No | Env fallback for storefront canonical/SEO URLs when admin URL is unset. | Production URL (e.g., `https://your-domain.com`). **Prefer Settings → Site URLs** once the admin panel is reachable. |
| `MONGODB_URI` | **Yes** | Database connection string. | MongoDB Atlas or local instance. *Must include DB name.* |
| `ATLAS_SEARCH_ENABLED` | No | Enables Atlas Search for the catalog. | Set `true` if using Atlas, `false` for local regex fallback. |
| `MONGODB_SEARCH_INDEX` | No | Name of the Atlas Search index. | Must match the created index (e.g., `products_search`). |
| `STORAGE_PROVIDER` | **Yes** | Where uploads/images are stored. | Set to `vercel-blob` by default. |
| `BLOB_READ_WRITE_TOKEN` | **Yes** | Token for Vercel Blob storage. | Vercel Dashboard → Storage. |
| `OTP_PROVIDER` | No | Provider for phone sign-in. | `twilio` (leave unset in dev to print codes to console). |
| `TWILIO_ACCOUNT_SID` | No | Twilio API credentials. | Twilio Console. |
| `TWILIO_AUTH_TOKEN` | No | Twilio API credentials. | Twilio Console. |
| `TWILIO_WHATSAPP_FROM` | No | WhatsApp sender number. | Twilio Console (e.g., `whatsapp:+14155238886`). |
| `TWILIO_SMS_FROM` | No | SMS sender number (fallback). | Twilio Console. |
| `OPENAI_API_KEY` | No | Powers the AI chat assistant. | OpenAI Dashboard. |
| `OPENAI_CHAT_MODEL` | No | Override default OpenAI model. | e.g., `gpt-4o-mini`. |
| `GOOGLE_AI_API_KEY` | No | Alternative AI provider (Gemini). | Google AI Studio. |
| `GEMINI_CHAT_MODEL` | No | Override default Gemini model. | e.g., `gemini-2.5-flash-lite`. |

### 4. Database Setup (Optional: Search Index)

If you are using MongoDB Atlas and want the AI chat assistant to use ranked/typo-tolerant search, create the search index:

```bash
npm run search-index -w @store/db
```
*(Note: If skipping this, ensure `ATLAS_SEARCH_ENABLED=false` so the app falls back to standard regex search).*

### 5. Run the Development Server

Start the Turborepo development pipeline (runs all apps and packages in parallel):

```bash
npm run dev
```

The storefront will typically be available at `http://localhost:3000`.

---

## Repository Structure

- `apps/` - Deployable applications (e.g., storefront, admin console).
- `packages/` - Shared libraries, UI components, and configurations.
- `docs/` - Operational documentation, architecture, and API docs.

---

## Common Issues / Troubleshooting

**1. Auth errors or redirects failing**
- **Cause:** `AUTH_SECRET` is missing or `AUTH_URL` doesn't match your local port.
- **Fix:** Ensure `AUTH_SECRET` is a 32-byte base64 string and `AUTH_URL=http://localhost:3000`.

**2. Database connection fails**
- **Cause:** IP not whitelisted in MongoDB Atlas, or missing database name in the URI.
- **Fix:** Check your Atlas Network Access tab. Ensure your `MONGODB_URI` ends with the database name (e.g., `...mongodb.net/mobile-store?...`).

**3. Cannot sign in locally (No OTP received)**
- **Cause:** Twilio credentials are not set.
- **Fix:** This is expected in dev. Leave `OTP_PROVIDER` unset, and the 6-digit OTP will print directly in your terminal/server logs.

**4. AI Chat Assistant isn't responding**
- **Cause:** Missing `OPENAI_API_KEY` or `GOOGLE_AI_API_KEY`.
- **Fix:** The chat will gracefully fall back to human-only mode without these keys. Add a key to test the AI locally.