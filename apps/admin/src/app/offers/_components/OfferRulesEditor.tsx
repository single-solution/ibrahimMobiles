import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { classNames } from "@store/shared";
import type { OfferCondition, OfferAction, OfferSchedule, OfferConstraints } from "@store/shared";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { Switch } from "@/components/forms/Switch";
import { Button } from "@store/ui";

interface OfferRulesEditorProps {
  conditions: OfferCondition[];
  onChangeConditions: (conditions: OfferCondition[]) => void;
  action: OfferAction;
  onChangeAction: (action: OfferAction) => void;
  schedule: OfferSchedule;
  onChangeSchedule: (schedule: OfferSchedule) => void;
  constraints: OfferConstraints;
  onChangeConstraints: (constraints: OfferConstraints) => void;
}

const CONDITION_TYPES = [
  { value: "products", label: "Specific Products (IDs)" },
  { value: "categories", label: "Categories (Slugs)" },
  { value: "brands", label: "Brands (Slugs)" },
  { value: "grades", label: "Grades (Slugs)" },
  { value: "attributes", label: "Attribute (slug + value)" },
  { value: "price_range", label: "Price Range" },
  { value: "cart_total", label: "Cart Total" },
];

/** Fields compared as numbers — their condition values cast to `Number`. */
const NUMERIC_CONDITION_TYPES = new Set(["price_range", "cart_total"]);

const OPERATORS = [
  { value: "in", label: "In / Equals" },
  { value: "not_in", label: "Not In / Not Equals" },
  { value: "between", label: "Between (min,max)" },
  { value: "gte", label: "Greater than or equal (>=)" },
  { value: "lte", label: "Less than or equal (<=)" },
];

const ACTION_TYPES = [
  { value: "percentage_discount", label: "Percentage Discount (%)" },
  { value: "fixed_amount_discount", label: "Fixed Amount Discount (Rs)" },
  { value: "free_shipping", label: "Free Shipping" },
];

const ACTION_TARGETS = [
  { value: "matched_items", label: "Matched Items Only" },
  { value: "cart_total", label: "Entire Cart Total" },
];

export function OfferRulesEditor({
  conditions,
  onChangeConditions,
  action,
  onChangeAction,
  schedule,
  onChangeSchedule,
  constraints,
  onChangeConstraints,
}: OfferRulesEditorProps) {
  
  function addCondition() {
    onChangeConditions([...conditions, { type: "categories", operator: "in", value: "" }]);
  }

  function updateCondition(index: number, updates: Partial<OfferCondition>) {
    const next = [...conditions];
    next[index] = { ...next[index], ...updates };
    onChangeConditions(next);
  }

  function removeCondition(index: number) {
    const next = [...conditions];
    next.splice(index, 1);
    onChangeConditions(next);
  }

  return (
    <div className="space-y-8">
      {/* ACTION CONFIGURATION */}
      <section className="space-y-4">
        <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)]">
          Discount Action
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            value={action.type}
            onChange={(e) => onChangeAction({ ...action, type: e.target.value as any })}
            options={ACTION_TYPES}
          />
          {action.type !== "free_shipping" && (
            <>
              <TextField
                label="Value"
                type="number"
                min="0"
                step="0.01"
                value={action.value}
                onChange={(e) => onChangeAction({ ...action, value: parseFloat(e.target.value) || 0 })}
                hint={action.type === "percentage_discount" ? "% off" : "Rs off"}
              />
              <SelectField
                label="Applies To"
                value={action.target}
                onChange={(e) => onChangeAction({ ...action, target: e.target.value as any })}
                options={ACTION_TARGETS}
              />
            </>
          )}
        </div>
      </section>

      {/* CONDITIONS BUILDER */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)]">
            Conditions
          </h3>
          <Button variant="outline" size="sm" type="button" onClick={addCondition}>
            <Plus size={14} className="mr-1" /> Add Rule
          </Button>
        </div>
        {conditions.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas)] p-6 text-center">
            <p className="text-[12px] font-medium text-[var(--color-ink-600)]">No conditions applied.</p>
            <p className="mt-1 text-[11px] text-[var(--color-ink-500)]">This offer will apply to everything in the cart if target is set to &quot;Entire Cart Total&quot;.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conditions.map((cond, i) => (
              <div key={i} className="relative flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-3 pl-4 pr-10 shadow-[var(--shadow-sm)] sm:flex-row sm:items-start">
                <div className="flex-1">
                  <SelectField
                    label="Field"
                    value={cond.type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      updateCondition(i, {
                        type: nextType as any,
                        value: nextType === "attributes" ? { slug: "", value: "" } : "",
                      });
                    }}
                    options={CONDITION_TYPES}
                  />
                </div>
                {cond.type === "attributes" ? (
                  <>
                    <div className="flex-1">
                      <TextField
                        label="Attribute slug"
                        value={cond.value?.slug ?? ""}
                        onChange={(e) =>
                          updateCondition(i, {
                            value: { slug: e.target.value, value: cond.value?.value ?? "" },
                          })
                        }
                        hint="e.g. color, storage"
                      />
                    </div>
                    <div className="flex-1">
                      <TextField
                        label="Match value"
                        value={cond.value?.value ?? ""}
                        onChange={(e) =>
                          updateCondition(i, {
                            value: { slug: cond.value?.slug ?? "", value: e.target.value },
                          })
                        }
                        hint="Variant attribute value to match"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <SelectField
                        label="Operator"
                        value={cond.operator}
                        onChange={(e) => updateCondition(i, { operator: e.target.value as any })}
                        options={OPERATORS}
                      />
                    </div>
                    <div className="flex-1">
                      <TextField
                        label="Value"
                        value={Array.isArray(cond.value) ? cond.value.join(",") : cond.value ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const isList =
                            cond.operator === "in" ||
                            cond.operator === "not_in" ||
                            cond.operator === "between";
                          const isNumeric = NUMERIC_CONDITION_TYPES.has(cond.type);
                          let val: any;
                          if (isList) {
                            const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
                            val = isNumeric || cond.operator === "between" ? parts.map(Number) : parts;
                          } else {
                            val = isNumeric ? parseFloat(raw) : raw;
                          }
                          updateCondition(i, { value: val });
                        }}
                        hint={
                          cond.operator === "in" ||
                          cond.operator === "not_in" ||
                          cond.operator === "between"
                            ? "Comma separated list"
                            : ""
                        }
                      />
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeCondition(i)}
                  className="absolute right-2 top-2 text-[var(--color-ink-400)] transition-colors hover:text-rose-600 sm:top-auto sm:bottom-3 sm:right-3"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SCHEDULE BUILDER */}
      <section className="space-y-4 border-t border-[var(--color-ink-100)] pt-6">
        <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)]">
          Active window &amp; schedule
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Start Date & Time"
            type="datetime-local"
            value={schedule.startDate ? new Date(schedule.startDate).toISOString().slice(0, 16) : ""}
            onChange={(e) => onChangeSchedule({ ...schedule, startDate: e.target.value ? new Date(e.target.value) : undefined })}
            hint="Offer goes live at this moment. Blank = live immediately."
          />
          <TextField
            label="End Date & Time"
            type="datetime-local"
            value={schedule.endDate ? new Date(schedule.endDate).toISOString().slice(0, 16) : ""}
            onChange={(e) => onChangeSchedule({ ...schedule, endDate: e.target.value ? new Date(e.target.value) : undefined })}
            hint="Offer ends here — also drives the storefront countdown. Blank = open-ended."
          />
          <TextField
            label="Daily Start Time"
            type="time"
            value={schedule.startTime || ""}
            onChange={(e) => onChangeSchedule({ ...schedule, startTime: e.target.value || undefined })}
            hint="E.g. 14:00 for happy hours"
          />
          <TextField
            label="Daily End Time"
            type="time"
            value={schedule.endTime || ""}
            onChange={(e) => onChangeSchedule({ ...schedule, endTime: e.target.value || undefined })}
          />
        </div>
        <TextField
          label="Recurring Days of Week"
          value={schedule.daysOfWeek?.join(",") || ""}
          onChange={(e) => {
            const vals = e.target.value.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0 && n <= 6);
            onChangeSchedule({ ...schedule, daysOfWeek: vals.length > 0 ? vals : undefined });
          }}
          hint="0=Sun, 1=Mon...6=Sat. Comma separated. Leave blank for every day."
        />
      </section>

      {/* CONSTRAINTS */}
      <section className="space-y-4 border-t border-[var(--color-ink-100)] pt-6">
        <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)]">
          Constraints
        </h3>
        <Switch
          label="Allow Loyalty Points"
          description="Can customers redeem loyalty points while this offer is active on their cart?"
          checked={constraints.allowLoyaltyPoints}
          onCheckedChange={(checked) => onChangeConstraints({ ...constraints, allowLoyaltyPoints: checked })}
        />
        <Switch
          label="Is Stackable"
          description="Can this offer be applied alongside other active offers?"
          checked={constraints.isStackable}
          onCheckedChange={(checked) => onChangeConstraints({ ...constraints, isStackable: checked })}
        />
        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <TextField
            label="Global Usage Limit"
            type="number"
            min="0"
            value={constraints.usageLimit || ""}
            onChange={(e) => onChangeConstraints({ ...constraints, usageLimit: parseInt(e.target.value, 10) || undefined })}
            hint="Max total redemptions. Leave blank for unlimited."
          />
          <TextField
            label="Current Usage Count"
            type="number"
            disabled
            value={constraints.usageCount || 0}
            onChange={() => {}}
            hint="How many times redeemed so far."
          />
        </div>
      </section>
    </div>
  );
}
