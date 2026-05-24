# OTP setup — WhatsApp first, SMS when needed

> **Policy:** WhatsApp for every number that has it. SMS **only** when Twilio reports the number is not on WhatsApp (error **63024**).

---

## Delivery logic

```
Enter phone → issue OTP
  → Try WhatsApp
      → Success → done (cheapest)
      → Twilio 63024 (not on WhatsApp) + TWILIO_SMS_FROM set → SMS
      → Other error (template, sandbox, network) → fail visibly, no SMS
  → User enters code → NextAuth sign-in → account created/updated
```

SMS is **not** sent on template errors, sandbox issues, or rate limits — only when the recipient genuinely has no WhatsApp.

---

## Production env

```bash
OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+92XXXXXXXXXX
TWILIO_SMS_FROM=+1XXXXXXXXXX          # or PK-capable sender — for non-WhatsApp numbers only
```

Without `TWILIO_SMS_FROM`, customers without WhatsApp cannot receive OTPs (WhatsApp-only store).

---

## End-to-end flow (storefront)

| Step | Where | What happens |
|------|--------|----------------|
| 1 | Cart / account | User taps checkout or sign-in |
| 2 | `PhoneOtpForm` | POST `/api/storefront/auth/otp` with phone |
| 3 | `issueCode` | Creates hashed OTP in MongoDB, calls Twilio provider |
| 4 | Twilio | WhatsApp send → poll status → SMS only on 63024 |
| 5 | User | Enters 6-digit code |
| 6 | NextAuth `customer-otp` | `verifyCode` → upsert `Customer` → session |
| 7 | Checkout | Signed-in user completes order |

If delivery fails on both channels, the API returns an error and **does not** leave a phantom “code sent” state (OTP row is deleted).

---

## Twilio setup checklist

### 1. Twilio account
- Sign up at [twilio.com](https://www.twilio.com/)
- Upgrade from trial for production

### 2. WhatsApp sandbox (dev)
1. Twilio Console → **Messaging** → **Try WhatsApp**
2. Join sandbox from your phone
3. `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886`

### 3. Live WhatsApp Business
1. Connect WhatsApp Business Account in Twilio
2. Approve authentication template
3. `TWILIO_WHATSAPP_FROM=whatsapp:+92XXXXXXXXXX`

### 4. SMS sender (non-WhatsApp fallback)
1. Buy/configure an SMS-capable Twilio number
2. `TWILIO_SMS_FROM=+1XXXXXXXXXX`
3. Only used when error **63024** — expect ~$0.47 USD per such SMS to PK

### 5. Deploy & test
- Add env vars to Vercel → redeploy
- Test with a **WhatsApp** number → should arrive on WhatsApp only
- Test with a **non-WhatsApp** number → should arrive via SMS (if `TWILIO_SMS_FROM` set)

---

## Dev without Twilio

Leave `TWILIO_*` empty. Codes print in the server log.

---

## Cost summary

| Scenario | Channel | Cost |
|----------|---------|------|
| Customer has WhatsApp | WhatsApp | Meta auth fee + $0.005 Twilio |
| Customer has no WhatsApp | SMS (63024 only) | ~$0.47 USD to PK |
| Template/config error | None (retry) | $0 — no accidental SMS |

---

## Order notifications

Still manual via **“Message us on WhatsApp”** links (free). Automated status messages are a separate future feature.
