# Catalog operations

How to manage products, attributes, pools, and variants in Admin after the catalog lives entirely in MongoDB.

---

## Mental model

1. **Category** defines which **attributes** and **grades** exist for that vertical (e.g. mobiles-tablets).
2. **Product** picks a subset of those attributes and whitelists option values (the **pool**).
3. **Variants** are concrete SKUs: one grade + one combination of attribute values + price + stock.

Shoppers only see products that pass the [visibility cascade](../README.md#visibility-cascade) and variants that match their PDP selections.

---

## Global attributes (Categories workspace)

Create attributes under each category — e.g. `storage`, `color`, `pta-status`, `ram`.

| Field | Notes |
| ----- | ----- |
| **Options** | Template values + labels for the whole category (e.g. `128gb` / `128 GB`). Slugs are derived from labels. |
| **Visibility** | Controls shop **filters**: always, by brand, or by grade. Does not limit which attributes a product can enable. |
| **Card position** | How the attribute appears on product cards (overlay, title chips, hidden). |

**Do not** add one-off model colors here if they only apply to a single phone — use product **custom options** instead.

---

## Product wizard

### Step 1 — Details & photos

- Category, brand, name, slug (auto from name if empty).
- Up to **8 images** on the product — shared by every variant.
- Featured / active / archive flags.

### Step 2 — Attributes & variants

**Attribute setup** (top of step 2)

| Field | What it does |
| ----- | ------------ |
| `attributeSlugs` | Which category attributes this product uses (checkbox list). |
| `attributeOptionPool` | Per slug: which **global** option values are allowed on this product. |
| `attributeCustomOptions` | Per slug: extra values + labels only for this product (e.g. `pink`, `ultramarine` on iPhone 16). |
| `attributeDefaults` | Optional pre-fill when adding a new variant row. |

**Variants** (grouped by grade)

Each row needs:

- **Grade** — must be an active grade for the product's category.
- **Price (PKR)** — integer rupees.
- **Quantity** — non-negative stock count.
- **Warranty days** — optional; storefront formats ≥ 30 days as months + days.
- **In stock toggle** — sets `forceOutOfStock` (sold out on storefront, quantity unchanged).
- **Attribute picks** — one value per enabled slug (from pool only).

**Rules enforced in Admin**

- Duplicate attribute combinations within the same grade are rejected.
- Variant values must be in the product pool (global whitelist + custom options).
- A product with zero variants is hidden from the storefront.

---

## Typical workflows

### New phone model

1. Confirm category attributes cover the needed dimensions (add global options like `256gb` if missing).
2. Create product — Step 1 with brand, name, photos.
3. Step 2 — enable slugs (`storage`, `color`, `pta-status`, `ram`, `sim-setup`, `battery-health`, …).
4. Set **option pool** to official colors/storage for that model; add **custom options** for colors not in the global Color list.
5. Add variants per grade with realistic PKR prices and stock.

### Accessory with one configuration

- Enable only relevant slugs (e.g. `type`, `connector`, `wattage`).
- Often one variant per grade with the same attribute map and different price/stock.

### Hide without deleting

- **Deactivate** product (`isActive` off) — keeps order history linkable.
- **Archive** — removes from default admin list; still hidden on storefront.
- **Force sold out** on a variant — keeps row for restock later.

### Bulk price or stock change

- Edit variants in the product wizard, or use per-variant API from integrations (no bulk CSV in app today).

---

## Storefront behavior

- **Listing filters** only show attribute values that exist on at least one visible variant in the current result set.
- **PDP configurator** exposes only `attributeSlugs` on the product; option chips come from the merged pool (global labels + custom labels).
- **URL params** sync grade + attribute selections; invalid combos reset client-side.
- **Closest match** — if the shopper's combo has no variant, the UI may snap to the nearest in-stock variant and offer WhatsApp inquiry.

---

## Orders and variant identity

Each variant has a MongoDB `_id`. Checkout lines store `productId` + `variantId` plus human-readable snapshots.

| Change | Effect on past orders | Effect on carts |
| ------ | --------------------- | --------------- |
| Edit price/qty on same variant `_id` | None (snapshot price) | Cart re-prices on next server fetch |
| Delete/replace all variants (new `_id`s) | None | Stale `variantId` — line may fail at checkout |
| Rename product | None (`productName` snapshot) | Name updates on next fetch |

After replacing variants wholesale, ask testers to clear cart and re-add items.

---

## Categories in this deployment

The platform supports multiple category slugs (e.g. `mobiles-tablets`, `accessories`, `gadgets`). Each has its own grades, attributes, and brands. Product URLs are `/{categorySlug}/{productSlug}`.

---

## Related docs

- Domain rules and limits: [README.md](../README.md) § Catalog
- Install and Atlas Search: [setup.md](setup.md)
- System layout: [architecture.md](architecture.md)
