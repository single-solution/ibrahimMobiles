# Ibrahim Mobiles — Functional Specification

This document uses visual flows and dense tables to map the exact business rules, state machines, and conditionals of the platform.

---

## 1. Catalog Visibility & Domain Rules

### Visibility Cascade
A product must pass every gate in this flow to appear on the storefront. If any node fails, the product is completely hidden.

```mermaid
flowchart LR
    A[Product] --> B{Is Active?}
    B -- Yes --> C{Is Archived?}
    C -- No --> D{Has Variants?}
    D -- Yes --> E{Category Active?}
    E -- Yes --> F{Brand Active?}
    F -- Yes --> G(((Visible on Storefront)))
    
    B -- No --> H(((Hidden)))
    C -- Yes --> H
    D -- No --> H
    E -- No --> H
    F -- No --> H
    
    style G fill:#10b981,stroke:#047857,color:white
    style H fill:#ef4444,stroke:#b91c1c,color:white
```

| Entity | Business Rules & Invariants |
|---|---|
| **Category** | **Integrity:** Cannot be deleted if referenced by products, brands, or grades. |
| **Brand** | **Scoping:** Brands are per-category (e.g., Apple in Phones vs Apple in Watches). |
| **Grade** | **Scoping:** Per-category condition tier (e.g., "Like New"). Drives badges and colors. |
| **Attribute** | **Visibility:** Can be set to show *Always*, *By Brand*, *By Grade*, or *By Parent Attribute* (cascading). |
| **Variant** | **Truth:** The absolute source of truth for price, stock, and condition. <br>**Stock:** In-stock if `quantity > 0`. |

---

## 2. Order Lifecycle & Fulfillment

### Status Timeline & Side Effects
This state machine dictates how an order progresses, when stock is released, and when loyalty points are awarded or reversed.

```mermaid
stateDiagram-v2
    [*] --> PendingPayment : Order Placed (Stock Reserved)
    PendingPayment --> Confirmed : Payment Verified
    Confirmed --> Packed : Dispatch Video Uploaded
    Packed --> Dispatched : Handed to Courier
    Dispatched --> Delivered : Received
    
    Delivered --> [*] : + Loyalty Points Earned
    
    PendingPayment --> Cancelled : Stock Released
    Confirmed --> Cancelled : Stock Released
    Packed --> Cancelled : Stock Released
    
    Delivered --> Returned : Stock Released (No Loyalty Reversal)
    Delivered --> Refunded : Stock Released & Loyalty Reversed
```

| Status | Allowed Actions & Side Effects |
|---|---|
| `pending-payment` | **Editable:** Line items, address, payment, delivery. Editing lines swaps stock reservations atomically. |
| `packed` | **Blocker:** Cannot enter this state without uploading/pasting a `dispatchVideoUrl`. |
| `dispatched` | **Invariant:** Cannot move status backward from here on the happy path. |

---

## 3. Checkout & Pricing Engine

### Price Calculation Flow
Prices are never trusted from the client. The server re-evaluates the cart at placement using this exact sequence.

```mermaid
flowchart TD
    A[Sum Variant DB Prices] --> B[Evaluate Offers Engine]
    B --> C{Bank Transfer?}
    C -- Yes --> D[Apply Bank Discount %]
    C -- No --> E[Base Discount]
    D --> F[Calculate Shipping]
    E --> F
    F --> G{Redeeming Points?}
    G -- Yes --> H[Subtract Loyalty Value]
    G -- No --> I[Final Total]
    H --> I
    
    style I fill:#3b82f6,stroke:#1d4ed8,color:white
```

| Feature | Rules & Conditionals |
|---|---|
| **Cart Limits** | Max 20 distinct lines. Max 10 qty per line (or variant stock cap). |
| **Offers Stacking** | Sequential based on admin `sortOrder`. First applied *non-stackable* offer stops evaluation. |
| **Delivery** | Courier is flat Rs 1,500 OR Free if subtotal ≥ admin threshold. Pickup is always free. |
| **Loyalty Redeem** | Min 100 points. Max 20% of subtotal. Disabled if an active offer explicitly disallows loyalty. |
| **Placement** | Idempotency key prevents double-charges. Insufficient stock throws an immediate error. |

---

## 4. AI Chat Assistant & Escalation

### Escalation Timeline
When the AI detects frustration or a direct request for a human, it triggers a strict escalation protocol.

```mermaid
sequenceDiagram
    actor Customer
    participant AI as AI Assistant
    participant System
    actor Admin as Human Agent

    Customer->>AI: "I want to speak to a manager"
    AI->>System: call escalate_to_human()
    System-->>Admin: Flag thread "Needs Senior"
    System->>AI: Mute AI (3 min grace period)
    
    alt Admin replies within 3 mins
        Admin->>Customer: "Hi, I'm the manager..."
        System->>AI: Unmute AI, clear escalation flag
    else No admin reply in 3 mins
        System->>AI: Unmute in "Reassurance-only" mode
        Customer->>AI: "Hello?"
        AI->>Customer: "Our senior team is reviewing this..."
    end
```

| Feature | Rules & Conditionals |
|---|---|
| **Guest Limits** | Guests get 5 customer-authored messages max. Composer is then replaced by a sign-in gate. |
| **AI Auto-Reply** | Bubbles drip with human-paced typing delays (200-260 cpm). |
| **AI Tools** | Can search catalog, check stock, list deals, check user orders/loyalty (scoped strictly to session ID). |

---

## 5. Storefront Navigation & Filters

| Feature | Rules & Conditionals |
|---|---|
| **Search Overlay** | **< 2 chars:** Shows random hints + 5 recent searches. **≥ 2 chars:** Debounced live results. |
| **Filters (AND logic)** | All active filters sync to URL. Changing any filter resets infinite scroll to page 1. |
| **Dynamic Facets** | Attribute options load dynamically based on current filter set. Zero-count options are hidden. |
| **Infinite Scroll** | 24 items per page. Auto-loads ~600px before end. Furthest-loaded page replaces browser history. |
| **Configurator** | If exact variant combo doesn't exist, auto-selects closest stocked variant & shows WhatsApp inquiry button. |

---

## 6. Authentication & Admin Roles

### OTP Sign-In Flow
```mermaid
flowchart LR
    A[Enter Phone] --> B{Rate Limited?}
    B -- Yes --> C[Error: Retry-After]
    B -- No --> D[Generate 6-digit OTP]
    D --> E[SMS Delivered]
    E --> F[Enter OTP]
    F --> G{Valid?}
    G -- No --> H[Increment Fail Count]
    H --> |5 Fails| I[Invalidate Code]
    G -- Yes --> J(((Create Session)))
```

| Role | Capabilities & Limits |
|---|---|
| **Owner** | Full access. Only role with `order_delete` and `data_cleanup`. |
| **Business Mgr** | Catalog, Orders, Customers, Loyalty, Chat, Offers, Settings. *Blocked:* Team invites, hard deletes. |
| **Product Mgr** | Catalog CRUD and Media only. |
| **Marketing Mgr** | Offers, Categories, Brands, Media. Read-only products. |
| **Support Staff** | Read-only Catalog/Orders/Customers. Can view + reply to chats. |
