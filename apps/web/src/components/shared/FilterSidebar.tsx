"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { gradeDescriptors } from "@/data/grades";
import { getCategoryById } from "@/data/products";
import {
	RAM_OPTIONS,
	STORAGE_OPTIONS,
	classNames,
	formatStorage,
	type Brand,
	type ConditionGrade,
	type ProductCategory,
} from "@store/shared";

import { FILTER_PARAM_KEYS } from "@/lib/storefront/filterParams";
import { useFilterParams } from "@/lib/storefront/useFilterParams";

interface FilterSidebarProps {
  /** Active category — drives which spec-specific filter blocks render. */
  category?: ProductCategory | "all";
  /** Live brand list from the DB, with product counts. Falls back to empty. */
  brands?: Brand[];
}

export function FilterSidebar({ category = "all", brands = [] }: FilterSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const filterApi = useFilterParams();
  const activeFilterCount = countActiveFilters(filterApi.params);

  return (
    <>
      <div className="flex-1 md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[13px] font-medium text-[var(--color-ink-800)] active:bg-[var(--color-canvas-deep)]"
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 grid size-4 place-items-center rounded-full bg-[var(--color-accent-700)] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <aside className="hidden md:sticky md:top-[calc(var(--desktop-header-h)+24px)] md:block md:h-[calc(100dvh-var(--desktop-header-h)-48px)]">
        <FilterPanel category={category} brands={brands} />
      </aside>

      <BottomSheet
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        title="Filter & sort"
        description="Narrow down by grade, brand, price and more."
        height="lg"
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              className="flex-1"
              onClick={() => {
                filterApi.clearAll();
              }}
            >
              Clear all
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-[2]"
              onClick={() => setIsMobileOpen(false)}
            >
              Show results
            </Button>
          </div>
        }
      >
        <FilterPanel category={category} brands={brands} isMobile />
      </BottomSheet>
    </>
  );
}

interface FilterPanelProps {
  isMobile?: boolean;
  category: ProductCategory | "all";
  brands: Brand[];
}

const ACCESSORY_TYPES: { id: string; label: string }[] = [
  { id: "charger", label: "Chargers" },
  { id: "cable", label: "Cables" },
  { id: "case", label: "Cases" },
  { id: "earbuds", label: "Earbuds" },
  { id: "screen-protector", label: "Screen guards" },
  { id: "power-bank", label: "Power banks" },
];

const CONNECTOR_OPTIONS: { id: string; label: string }[] = [
  { id: "usb-c", label: "USB-C" },
  { id: "lightning", label: "Lightning" },
  { id: "micro-usb", label: "Micro-USB" },
  { id: "wireless", label: "Wireless" },
];

const WATTAGE_OPTIONS = [20, 30, 65, 100];

/** Phone-only — battery health is the maximum-capacity reading reported by the
 *  battery diagnostic. Buckets are progressive ("90%+" includes 95%+ etc); UI
 *  treats them as single-select buckets so the user picks the floor. */
const BATTERY_HEALTH_OPTIONS: { id: number; label: string }[] = [
  { id: 95, label: "95% +" },
  { id: 90, label: "90% +" },
  { id: 85, label: "85% +" },
  { id: 80, label: "80% +" },
];

/** Phone-only — Pakistan Telecom Authority approval status. */
const PTA_OPTIONS: { id: "1" | "0"; label: string }[] = [
  { id: "1", label: "PTA approved" },
  { id: "0", label: "Non-PTA" },
];

/** Gadget-only — top-level gadget kinds shown in the gadgets filter sidebar. */
const GADGET_TYPES: { id: string; label: string }[] = [
  { id: "console", label: "Gaming consoles" },
  { id: "smart-watch", label: "Smart watches" },
  { id: "laptop", label: "Laptops" },
  { id: "vr", label: "VR headsets" },
  { id: "drone", label: "Drones" },
  { id: "camera", label: "Cameras" },
];

function FilterPanel({ isMobile = false, category, brands }: FilterPanelProps) {
  const filterApi = useFilterParams();
  const router = useRouter();
  const pathname = usePathname();

  const grades = filterApi.getMulti(FILTER_PARAM_KEYS.grades);
  const brandSlugs = filterApi.getMulti(FILTER_PARAM_KEYS.brands);
  const minPriceParam = filterApi.getSingle(FILTER_PARAM_KEYS.minPrice) ?? "";
  const maxPriceParam = filterApi.getSingle(FILTER_PARAM_KEYS.maxPrice) ?? "";
  const storageRaw = filterApi.getMulti(FILTER_PARAM_KEYS.storage);
  const ramRaw = filterApi.getMulti(FILTER_PARAM_KEYS.ram);
  const battery = filterApi.getSingle(FILTER_PARAM_KEYS.battery);
  const pta = filterApi.getSingle(FILTER_PARAM_KEYS.pta);
  const accessoryTypes = filterApi.getMulti(FILTER_PARAM_KEYS.accessoryTypes);
  const connectors = filterApi.getMulti(FILTER_PARAM_KEYS.connectors);
  const wattages = filterApi.getMulti(FILTER_PARAM_KEYS.wattages);
  const gadgetTypes = filterApi.getMulti(FILTER_PARAM_KEYS.gadgetTypes);

  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);

  const showPhoneFilters = category === "all" || category === "phone";
  const showAccessoryFilters = category === "all" || category === "accessory";
  const showGadgetFilters = category === "all" || category === "gadget";

  // Per-shop grade list. When viewing "all" we show every grade; when viewing
  // a specific shop, only the grades that apply to it.
  const visibleGrades = useMemo<ConditionGrade[]>(() => {
    if (category === "all") {
      return gradeDescriptors.map((descriptor) => descriptor.grade);
    }
    const meta = getCategoryById(category);
    return meta?.applicableGrades ?? gradeDescriptors.map((descriptor) => descriptor.grade);
  }, [category]);

  const applyPriceRange = () => {
    const next = new URLSearchParams(filterApi.params.toString());
    if (minPrice) {
      next.set(FILTER_PARAM_KEYS.minPrice, minPrice);
    } else {
      next.delete(FILTER_PARAM_KEYS.minPrice);
    }
    if (maxPrice) {
      next.set(FILTER_PARAM_KEYS.maxPrice, maxPrice);
    } else {
      next.delete(FILTER_PARAM_KEYS.maxPrice);
    }
    next.delete(FILTER_PARAM_KEYS.page);
    const queryString = next.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const content = (
    <div className={isMobile ? "sheet-stagger space-y-6" : "space-y-3 p-2.5"}>
      <FilterGroup title="Grade">
        <div className="space-y-0.5">
          {gradeDescriptors
            .filter((descriptor) => visibleGrades.includes(descriptor.grade))
            .map((descriptor) => (
              <FilterCheckRow
                key={descriptor.grade}
                label={descriptor.label}
                checked={grades.includes(descriptor.grade)}
                onToggle={() =>
                  filterApi.toggleInMulti(FILTER_PARAM_KEYS.grades, descriptor.grade)
                }
              />
            ))}
        </div>
      </FilterGroup>

      <FilterDivider />

      <FilterGroup title="Brand">
        {brands.length === 0 ? (
          <p className="px-2 text-[12px] text-[var(--color-ink-500)]">
            No brands available yet.
          </p>
        ) : (
          <div className="space-y-0.5">
            {brands.map((brand) => (
              <FilterCheckRow
                key={brand.slug}
                label={brand.name}
                count={brand.phoneCount}
                checked={brandSlugs.includes(brand.slug)}
                onToggle={() =>
                  filterApi.toggleInMulti(FILTER_PARAM_KEYS.brands, brand.slug)
                }
              />
            ))}
          </div>
        )}
      </FilterGroup>

      <FilterDivider />

      <FilterGroup title="Price">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PriceInput
              value={minPrice}
              onChange={setMinPrice}
              placeholder="Min"
              ariaLabel="Minimum price in rupees"
            />
            <span aria-hidden className="text-[var(--color-ink-300)]">–</span>
            <PriceInput
              value={maxPrice}
              onChange={setMaxPrice}
              placeholder="Max"
              ariaLabel="Maximum price in rupees"
            />
          </div>
          <button
            type="button"
            onClick={applyPriceRange}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[13px] font-semibold text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-accent-600)]"
          >
            <Check size={14} strokeWidth={2.6} />
            Apply
          </button>
        </div>
      </FilterGroup>

      {showPhoneFilters && (
        <>
          <FilterDivider />

          <FilterGroup title="Storage">
            <div className="flex flex-wrap gap-1.5">
              {STORAGE_OPTIONS.map((storageGb) => (
                <FilterPill
                  key={storageGb}
                  isActive={storageRaw.includes(String(storageGb))}
                  onClick={() =>
                    filterApi.toggleInMulti(FILTER_PARAM_KEYS.storage, String(storageGb))
                  }
                >
                  {formatStorage(storageGb)}
                </FilterPill>
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="RAM">
            <div className="flex flex-wrap gap-1.5">
              {RAM_OPTIONS.map((ramGb) => (
                <FilterPill
                  key={ramGb}
                  isActive={ramRaw.includes(String(ramGb))}
                  onClick={() =>
                    filterApi.toggleInMulti(FILTER_PARAM_KEYS.ram, String(ramGb))
                  }
                >
                  {ramGb} GB
                </FilterPill>
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Battery health">
            <div className="flex flex-wrap gap-1.5">
              {BATTERY_HEALTH_OPTIONS.map((option) => {
                const isActive = battery === String(option.id);
                return (
                  <FilterPill
                    key={option.id}
                    isActive={isActive}
                    onClick={() =>
                      filterApi.setSingle(
                        FILTER_PARAM_KEYS.battery,
                        isActive ? "" : String(option.id),
                      )
                    }
                  >
                    {option.label}
                  </FilterPill>
                );
              })}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="PTA status">
            <div className="flex flex-wrap gap-1.5">
              {PTA_OPTIONS.map((option) => {
                const isActive = pta === option.id;
                return (
                  <FilterPill
                    key={option.id}
                    isActive={isActive}
                    onClick={() =>
                      filterApi.setSingle(FILTER_PARAM_KEYS.pta, isActive ? "" : option.id)
                    }
                  >
                    {option.label}
                  </FilterPill>
                );
              })}
            </div>
          </FilterGroup>
        </>
      )}

      {showAccessoryFilters && (
        <>
          <FilterDivider />

          <FilterGroup title="Type">
            <div className="space-y-0.5">
              {ACCESSORY_TYPES.map((type) => (
                <FilterCheckRow
                  key={type.id}
                  label={type.label}
                  checked={accessoryTypes.includes(type.id)}
                  onToggle={() =>
                    filterApi.toggleInMulti(FILTER_PARAM_KEYS.accessoryTypes, type.id)
                  }
                />
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Connector">
            <div className="flex flex-wrap gap-1.5">
              {CONNECTOR_OPTIONS.map((connector) => (
                <FilterPill
                  key={connector.id}
                  isActive={connectors.includes(connector.id)}
                  onClick={() =>
                    filterApi.toggleInMulti(FILTER_PARAM_KEYS.connectors, connector.id)
                  }
                >
                  {connector.label}
                </FilterPill>
              ))}
            </div>
          </FilterGroup>

          <FilterDivider />

          <FilterGroup title="Wattage">
            <div className="flex flex-wrap gap-1.5">
              {WATTAGE_OPTIONS.map((wattage) => (
                <FilterPill
                  key={wattage}
                  isActive={wattages.includes(String(wattage))}
                  onClick={() =>
                    filterApi.toggleInMulti(FILTER_PARAM_KEYS.wattages, String(wattage))
                  }
                >
                  {wattage}W
                </FilterPill>
              ))}
            </div>
          </FilterGroup>
        </>
      )}

      {showGadgetFilters && (
        <>
          <FilterDivider />

          <FilterGroup title="Type">
            <div className="space-y-0.5">
              {GADGET_TYPES.map((type) => (
                <FilterCheckRow
                  key={type.id}
                  label={type.label}
                  checked={gadgetTypes.includes(type.id)}
                  onToggle={() =>
                    filterApi.toggleInMulti(FILTER_PARAM_KEYS.gadgetTypes, type.id)
                  }
                />
              ))}
            </div>
          </FilterGroup>
        </>
      )}

      {!isMobile && countActiveFilters(filterApi.params) > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => filterApi.clearAll()}
            className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 text-[12px] font-semibold text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)]"
          >
            <X size={12} />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
  	return content;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {content}
      </div>
    </div>
  );
}

/** Quick count of how many filter groups are currently set. */
function countActiveFilters(params: URLSearchParams): number {
  let activeCount = 0;
  for (const key of Object.values(FILTER_PARAM_KEYS)) {
    if (
      key === FILTER_PARAM_KEYS.sort
      || key === FILTER_PARAM_KEYS.page
      || key === FILTER_PARAM_KEYS.search
    ) {
      continue;
    }
    if (params.get(key)) {
    	activeCount += 1;
    }
  }
  return activeCount;
}

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
}

function FilterGroup({ title, children }: FilterGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterDivider() {
  return <div className="h-px bg-[var(--color-ink-100)]" />;
}

interface FilterPillProps {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

function FilterPill({ children, isActive, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={classNames(
        "inline-flex items-center rounded-full px-3 py-1 text-[12.5px] transition-colors",
        isActive
          ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
          : "border border-[var(--color-ink-100)] font-medium text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]",
      )}
    >
      {children}
    </button>
  );
}

interface PriceInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  ariaLabel: string;
}

function PriceInput({ value, onChange, placeholder, ariaLabel }: PriceInputProps) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ""))}
      className="h-9 w-full flex-1 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 text-[13px] font-medium text-[var(--color-ink-900)] outline-none transition-colors placeholder:font-normal placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-700)] focus:ring-2 focus:ring-[var(--color-accent-100)]"
    />
  );
}

interface FilterCheckRowProps {
  label: string;
  count?: number;
  checked: boolean;
  onToggle: () => void;
}

function FilterCheckRow({ label, count, checked, onToggle }: FilterCheckRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className={classNames(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1 text-[13.5px] transition-colors",
        checked
          ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
          : "font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
      )}
    >
      <span className="flex items-center gap-2.5">
        <span
          aria-hidden
          className={classNames(
            "grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
            checked
              ? "border-[var(--color-accent-700)] bg-[var(--color-accent-700)] text-white"
              : "border-[var(--color-ink-200)] bg-[var(--color-surface)]",
          )}
        >
          {checked && <Check size={12} strokeWidth={3} />}
        </span>
        <span>{label}</span>
      </span>
      {count !== undefined && (
        <span
          className={classNames(
            "text-[11.5px]",
            checked ? "text-[var(--color-accent-700)]" : "text-[var(--color-ink-400)]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
