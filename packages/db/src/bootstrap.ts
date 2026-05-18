/**
 * Idempotent reference-data bootstrap.
 *
 * `Grade` and `Category` are *reference* collections: their **slugs** are part
 * of the schema enums (`CONDITION_GRADES`, `CATEGORY_IDS`) and cannot be
 * created from the admin UI — only their human-facing *content* (label,
 * description, taglines, applicableGrades, etc.) is editable.
 *
 * Without these collections populated, the storefront has nothing to render
 * for grade chips, filter sidebars, or category landing pages. So on every
 * server boot we ensure each fixed slug has a document — using `upsert` with
 * `$setOnInsert` so existing admin-edited rows are **never overwritten**.
 *
 * This is *not* "seed fake data". This is "ensure the reference taxonomy that
 * the storefront needs in order to function exists at all".
 *
 * Boot ordering:
 *   - `instrumentation.ts` calls `ensureReferenceData()` after the Mongo
 *     connection is requested (we don't await it — the first request that
 *     reads grades/categories will await `connectDB()` itself, which is also
 *     awaited by the bootstrap before its upserts run).
 *   - Safe to call concurrently from web + admin instances; each upsert is
 *     atomic and `$setOnInsert` makes the operation idempotent.
 */
import { logger } from "@store/shared";

import { connectDB } from "./connection";
import { Category, type CategoryAttributes, type CategoryId } from "./models/Category";
import { Grade, type GradeAttributes, type GradeTone } from "./models/Grade";
import { type ConditionGrade } from "./models/Category";

type GradeDefaults = Pick<
  GradeAttributes,
  | "grade"
  | "label"
  | "shortLabel"
  | "description"
  | "cosmeticNotes"
  | "functionalNotes"
  | "tone"
  | "sortOrder"
>;

/**
 * Default content for the six condition grades. Mirrors the labels we shipped
 * in the legacy `apps/web/src/data/grades.ts` so existing screenshots / docs
 * stay accurate. Admins are free to rewrite any field via the admin UI.
 */
const DEFAULT_GRADES: ReadonlyArray<GradeDefaults> = [
  {
    grade: "brand-new",
    label: "Brand New",
    shortLabel: "Brand new",
    description:
      "Factory-sealed, unopened. Full international warranty where applicable. Highest grade we carry.",
    cosmeticNotes: "Pristine — original packaging, all seals intact, no marks.",
    functionalNotes: "Battery health 100%. All accessories included, untouched.",
    tone: "dark",
    sortOrder: 0,
  },
  {
    grade: "genuine",
    label: "Genuine",
    shortLabel: "Genuine",
    description:
      "Authentic, original-spec device imported through legitimate channels. Most reliable used-stock category.",
    cosmeticNotes: "Light wear at most — no chassis damage, screen flawless or near-flawless.",
    functionalNotes: "Battery health 90%+. Genuine charging accessories included.",
    tone: "accent",
    sortOrder: 1,
  },
  {
    grade: "box-open",
    label: "Box Open",
    shortLabel: "Box-open",
    description:
      "Sealed box opened for inspection or display only — never used. Comes with original accessories.",
    cosmeticNotes: "No marks, no scratches. Box may show light handling.",
    functionalNotes: "Battery health 99%+. All accessories included.",
    tone: "info",
    sortOrder: 2,
  },
  {
    grade: "refurbished",
    label: "Refurbished",
    shortLabel: "Refurbished",
    description:
      "Professionally repaired or restored — battery and key parts replaced. Not factory-original throughout.",
    cosmeticNotes: "Restored body, replacement screen or back may differ slightly from original.",
    functionalNotes: "Battery health 85%+ (replaced). Warranty covers our service work.",
    tone: "neutral",
    sortOrder: 3,
  },
  {
    grade: "china-water",
    label: "China Water Pack",
    shortLabel: "China-pack",
    description:
      "Chinese-region stock, often parallel-imported. Usually cheaper but mixed reliability — checked thoroughly before listing.",
    cosmeticNotes: "Cosmetics vary unit to unit. Each unit photographed before dispatch.",
    functionalNotes: "Battery health 80%+. Often non-PTA — check listing for status.",
    tone: "warn",
    sortOrder: 4,
  },
  {
    grade: "lcd-shaded",
    label: "LCD Shaded",
    shortLabel: "LCD shaded",
    description:
      "Functional unit with visible screen tint, shadow or burn-in. Heavily discounted — best for budget buyers who don't mind a marked display.",
    cosmeticNotes: "Visible display defect (tint, shadow, dead spots, burn-in).",
    functionalNotes: "Battery health 80%+. All other features tested and working.",
    tone: "danger",
    sortOrder: 5,
  },
] as const;

type CategoryDefaults = Pick<
  CategoryAttributes,
  | "categoryId"
  | "label"
  | "pluralLabel"
  | "pathSegment"
  | "isActive"
  | "tagline"
  | "applicableGrades"
  | "trustChips"
  | "emptyHint"
  | "sortOrder"
>;

const ALL_GRADES: ConditionGrade[] = [
  "brand-new",
  "genuine",
  "box-open",
  "refurbished",
  "china-water",
  "lcd-shaded",
];
const NON_PHONE_GRADES: ConditionGrade[] = [
  "brand-new",
  "genuine",
  "box-open",
  "refurbished",
];

const DEFAULT_CATEGORIES: ReadonlyArray<CategoryDefaults> = [
  {
    categoryId: "phone",
    label: "Phone",
    pluralLabel: "Phones",
    pathSegment: "phones",
    isActive: true,
    tagline: "Pre-owned phones, condition-graded and PTA-checked.",
    applicableGrades: ALL_GRADES,
    trustChips: ["7-day moneyback", "Battery tested", "PTA status shown"],
    emptyHint: "Try a brand or model — like \u201ciPhone 13\u201d or \u201cGalaxy A54\u201d.",
    sortOrder: 0,
  },
  {
    categoryId: "accessory",
    label: "Accessory",
    pluralLabel: "Accessories",
    pathSegment: "accessories",
    isActive: true,
    tagline: "Chargers, cables, cases & earbuds — graded just like the phones.",
    applicableGrades: NON_PHONE_GRADES,
    trustChips: ["OEM where marked", "Tested for output", "Replacement warranty"],
    emptyHint: "Try \u201cUSB-C cable\u201d, \u201cMagSafe\u201d or \u201cAirPods\u201d.",
    sortOrder: 1,
  },
  {
    categoryId: "gadget",
    label: "Gadget",
    pluralLabel: "Gadgets",
    pathSegment: "gadgets",
    isActive: false,
    tagline: "Pre-owned consoles, smartwatches, laptops and more — coming soon.",
    applicableGrades: NON_PHONE_GRADES,
    trustChips: ["Function-tested", "Photo-verified", "Warranty on every grade"],
    emptyHint: "Coming soon \u2014 we\u2019re curating the lineup.",
    sortOrder: 2,
  },
] as const;

/**
 * Idempotently ensure every condition grade has a row. Uses `$setOnInsert`
 * so admin edits made through `PUT /api/grades/:id` are preserved across
 * reboots — only missing rows are created.
 */
async function ensureDefaultGrades(): Promise<void> {
  for (const defaults of DEFAULT_GRADES) {
    await Grade.updateOne(
      { grade: defaults.grade },
      { $setOnInsert: defaults satisfies { grade: ConditionGrade; tone: GradeTone } },
      { upsert: true },
    );
  }
}

/**
 * Same contract for categories. The three IDs are enum members on the
 * schema, so we can never create more from the admin — these three are
 * the entire taxonomy until the schema is widened.
 */
async function ensureDefaultCategories(): Promise<void> {
  for (const defaults of DEFAULT_CATEGORIES) {
    await Category.updateOne(
      { categoryId: defaults.categoryId },
      { $setOnInsert: defaults satisfies { categoryId: CategoryId } },
      { upsert: true },
    );
  }
}

/**
 * Public entrypoint called once at server boot from each app's
 * `instrumentation.ts`. Best-effort: a connectivity blip just logs and
 * returns — the next boot will retry.
 */
export async function ensureReferenceData(): Promise<void> {
  try {
    await connectDB();
    await Promise.all([ensureDefaultGrades(), ensureDefaultCategories()]);
    logger.info("reference-data: grades + categories verified");
  } catch (error) {
    // Atlas allowlist gap, transient network blip, etc. We never want this
    // to crash the worker — the storefront is hardened to degrade
    // gracefully when reads return zero rows.
    logger.error({ error }, "reference-data: bootstrap skipped this boot");
  }
}
