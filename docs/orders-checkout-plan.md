# Orders, Account & Checkout — Plan

> Status: **In progress.** OTP + checkout flow polish shipped; notifications optional later.

---

## Goal

Customer path: **cart → phone OTP → checkout → order placed → account + payment steps**.

---

## What we already have

| Piece | Notes |
|-------|--------|
| **OTP sign-in** | First verify creates the account (no separate register page) |
| **Account** | Dashboard, profile, orders list, order detail, messages |
| **Checkout** | Contact → delivery → payment → place order |
| **Order API** | Server-validated `POST /api/storefront/orders` |
| **Admin** | Order list + status transitions |

---

## Happy path

```
Shop → Cart → Checkout
  → OTP (if guest)
  → Name + delivery + payment
  → Place order
  → Success page (payment steps + order link)
  → /account/orders/{orderNumber}
```

---

## Build phases

### Phase A — Core flow (done)
- Shared `PhoneOtpForm` for sign-in + checkout
- Payment instructions on success + pending-payment order detail
- Success page links to order detail
- Payment label mapping fix (`bank-transfer` ↔ `bank`)

### Phase B — Optional later
- Automated order-status WhatsApp (templates + BSP)
- Loyalty self-enrollment at checkout
- Payment proof upload

See **[OTP setup (WhatsApp)](otp-setup.md)** for Twilio configuration and cost notes.

---

## Out of scope

- Guest checkout without account
- Email/password registration
- Online payment gateway (JazzCash/Easypaisa API)
