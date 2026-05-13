"use client";

import { useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { SelectField } from "@/components/admin/forms/SelectField";
import { useToast } from "@/components/admin/Toast";
import type { Testimonial } from "@/types";

interface TestimonialsTableProps {
  testimonials: Testimonial[];
}

export function TestimonialsTable({ testimonials }: TestimonialsTableProps) {
  const toast = useToast();
  const [editing, setEditing] = useState<Testimonial | "new" | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);

  const columns: DataTableColumn<Testimonial>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (testimonial) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
            {testimonial.customerName
              .split(" ")
              .map((part) => part.charAt(0))
              .slice(0, 2)
              .join("")}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">
              {testimonial.customerName}
            </p>
            <p className="text-[11px] text-[var(--color-ink-500)]">{testimonial.customerCity}</p>
          </div>
        </div>
      ),
    },
    {
      id: "rating",
      header: "Rating",
      cell: (testimonial) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, index) => index).map((starIndex) => (
            <Star
              key={starIndex}
              size={12}
              strokeWidth={2}
              className={
                starIndex < testimonial.rating
                  ? "fill-amber-400 stroke-amber-400"
                  : "stroke-[var(--color-ink-300)]"
              }
            />
          ))}
        </div>
      ),
    },
    {
      id: "review",
      header: "Review",
      hideOnMobile: true,
      cell: (testimonial) => (
        <p className="line-clamp-2 max-w-md text-xs text-[var(--color-ink-700)]">
          {testimonial.body}
        </p>
      ),
    },
    {
      id: "model",
      header: "Bought",
      hideOnMobile: true,
      cell: (testimonial) => (
        <span className="text-xs font-semibold text-[var(--color-ink-800)]">
          {testimonial.purchasedModel}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "100px",
      cell: (testimonial) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit"
            onClick={() => setEditing(testimonial)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            aria-label="Delete"
            onClick={() => setDeleting(testimonial)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={testimonials}
        columns={columns}
        rowKey={(testimonial) => testimonial.id}
        searchAccessor={(testimonial) =>
          `${testimonial.customerName} ${testimonial.customerCity} ${testimonial.body} ${testimonial.purchasedModel}`
        }
        searchPlaceholder="Search reviews…"
        toolbar={
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => setEditing("new")}
          >
            Add testimonial
          </Button>
        }
      />

      <Drawer
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add testimonial" : "Edit testimonial"}
        width="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => {
                toast.success(editing === "new" ? "Testimonial added" : "Testimonial saved");
                setEditing(null);
              }}
            >
              {editing === "new" ? "Add testimonial" : "Save testimonial"}
            </Button>
          </div>
        }
      >
        <TestimonialForm
          testimonial={typeof editing === "object" ? editing : null}
        />
      </Drawer>

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Delete testimonial?"
        message={
          <>This will remove the review from <strong>{deleting?.customerName}</strong> immediately.</>
        }
        tone="danger"
        confirmLabel="Delete review"
        onConfirm={() => {
          if (deleting) toast.warn(`Review by ${deleting.customerName} removed`);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

interface TestimonialFormProps {
  testimonial: Testimonial | null;
}

function TestimonialForm({ testimonial }: TestimonialFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Customer name" defaultValue={testimonial?.customerName ?? ""} />
        <TextField label="City" defaultValue={testimonial?.customerCity ?? ""} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Rating"
          defaultValue={String(testimonial?.rating ?? 5)}
          options={[5, 4, 3, 2, 1].map((rating) => ({
            value: String(rating),
            label: `${rating} star${rating === 1 ? "" : "s"}`,
          }))}
        />
        <TextField
          label="Purchased model"
          defaultValue={testimonial?.purchasedModel ?? ""}
        />
      </div>
      <TextArea label="Review body" defaultValue={testimonial?.body ?? ""} rows={5} />
    </div>
  );
}
