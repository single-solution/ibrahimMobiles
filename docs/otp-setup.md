# OTP Setup — WhatsApp + SMS via Twilio

The storefront's customer sign-in flow delivers a one-time code (OTP) to the
customer's phone. In development, codes are printed to the server log and no
external provider is required. In production we deliver via Twilio
(WhatsApp first, SMS fallback when the recipient is not on WhatsApp).

This guide walks through the production setup.

---

## 1. Pick a delivery mode

| Mode | When to use | Env vars |
|---|---|---|
| Dev (log codes) | Local development; QA without a phone | _(leave Twilio unset)_ |
| WhatsApp only | Cheapest production setup | `OTP_PROVIDER=twilio`, `TWILIO_WHATSAPP_FROM`, `OTP_DISABLE_SMS=1` |
| WhatsApp + SMS fallback | Default production | `OTP_PROVIDER=twilio`, `TWILIO_WHATSAPP_FROM`, `TWILIO_SMS_FROM` |
| SMS only | Markets with low WhatsApp penetration | `OTP_PROVIDER=twilio`, `TWILIO_SMS_FROM`, `OTP_DISABLE_WHATSAPP=1` |

---

## 2. Create a Twilio account

1. Sign up at <https://www.twilio.com/try-twilio>.
2. From the console dashboard, copy the **Account SID** and **Auth Token**.
3. Set them in your environment:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
OTP_PROVIDER=twilio
```

---

## 3. Configure WhatsApp sending

### Sandbox (testing only)

Twilio's WhatsApp sandbox is free but requires every recipient to opt in by
texting a join code first. Use it to verify end-to-end before approval.

```bash
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

Then in the Twilio console: **Messaging → Try it out → Send a WhatsApp
message** to get the join code. Every test phone must send that code to
`+14155238886` once before it can receive OTPs.

### Live (production)

1. In the Twilio console go to **Messaging → Senders → WhatsApp senders**.
2. Submit a sender request — Twilio reviews business name, profile photo,
   and uses-case description. Approval takes 1–5 business days.
3. Once approved, set:

```bash
TWILIO_WHATSAPP_FROM=whatsapp:+<your-approved-number>   # your approved sender
```

---

## 4. Configure SMS fallback (optional)

If a customer's phone is not on WhatsApp, Twilio returns error `63024` and
the storefront retries with SMS. Provide a US/global Twilio number to
enable this:

```bash
TWILIO_SMS_FROM=+15551234567
```

If you don't want SMS fallback, leave `TWILIO_SMS_FROM` unset or set
`OTP_DISABLE_SMS=1` explicitly.

---

## 5. Verify

1. Restart both apps (`npm run dev`).
2. From the storefront, sign in with a phone number that's opted into the
   sandbox (or any number in production).
3. Watch the server log — you should see `otp: WhatsApp send ok` (or
   `otp: SMS send ok` on fallback). The OTP itself is **never** logged in
   production; in dev mode without `OTP_PROVIDER=twilio` the code is
   printed.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `63007` — channel not enabled | Sandbox not joined / sender unapproved | Join sandbox or wait for approval |
| `63024` — recipient not on WhatsApp | Customer doesn't have WhatsApp | Add `TWILIO_SMS_FROM` for SMS fallback |
| `21211` — invalid phone format | Number missing country code | Storefront normalises to E.164; double-check the input pattern |
| Codes still printed in log in prod | `OTP_PROVIDER` not set | Set `OTP_PROVIDER=twilio` and redeploy |

---

## Security

- `TWILIO_AUTH_TOKEN` is a secret — it never leaves env vars; never log it.
- OTP codes are hashed (`OtpCode.codeHash`, `select: false`) — the raw code
  is delivered to Twilio and discarded.
- Rate limits live in `apps/web/src/lib/auth.ts` (`CUSTOMER_OTP_ATTEMPTS_PER_WINDOW`)
  and in the OTP issuance route — tune in `packages/shared/src/constants.ts`.
