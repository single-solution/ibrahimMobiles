# Ibrahim Mobiles

A storefront for pre-owned mobile phones — browse by brand, by condition grade, and by current offers.

> This is a **view-only prototype**. There is no backend, no cart logic, no checkout. All product data is mock data living in `src/data/`.

---

## Tech Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **lucide-react** for icons

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
├── app/                      # Pages (App Router)
│   ├── page.tsx              # Home
│   ├── shop/                 # Listing + product detail
│   ├── deals/                # Offers page
│   ├── about/                # About page
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                   # Primitives: Button, Badge, Card, Input, Select
│   ├── layout/               # Header, Footer
│   └── shared/               # Domain: PhoneCard, GradeBadge, OfferCard, FilterSidebar, BrandTile
│
├── data/                     # Mock data: phones, brands, offers
├── lib/                      # Pure helpers (formatPrice, classNames)
└── types/                    # Domain types (Phone, Brand, Grade, Offer)
```

---

## What's a "Grade"?

Every pre-owned phone is rated by physical condition:

| Grade | Meaning |
|-------|---------|
| A+    | Like new — unboxed, no marks |
| A     | Excellent — only visible under direct light |
| B     | Good — minor scuffs, fully functional |
| C     | Fair — visible wear, fully functional |

Grade definitions live in `src/data/grades.ts`.

---

## Adding a Phone

Edit `src/data/phones.ts` and append a new entry. Every phone needs a brand slug and a grade. The shop page picks them up automatically.
