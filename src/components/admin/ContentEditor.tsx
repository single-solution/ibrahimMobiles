"use client";

import { useState } from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/admin/Tabs";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { TextField } from "@/components/admin/forms/TextField";
import { TextArea } from "@/components/admin/forms/TextArea";
import { useToast } from "@/components/admin/Toast";
import type { ContentBlock, FaqEntry } from "@/data/admin/adminContent";

interface ContentEditorProps {
  homeBlocks: ContentBlock[];
  aboutBlocks: ContentBlock[];
  footerBlocks: ContentBlock[];
  faqEntries: FaqEntry[];
}

export function ContentEditor({
  homeBlocks,
  aboutBlocks,
  footerBlocks,
  faqEntries,
}: ContentEditorProps) {
  return (
    <Tabs
      tabs={[
        {
          id: "home",
          label: "Home page",
          count: homeBlocks.length,
          content: <BlockList blocks={homeBlocks} />,
        },
        {
          id: "about",
          label: "About page",
          count: aboutBlocks.length,
          content: <BlockList blocks={aboutBlocks} />,
        },
        {
          id: "faq",
          label: "FAQ",
          count: faqEntries.length,
          content: <FaqList entries={faqEntries} />,
        },
        {
          id: "footer",
          label: "Footer",
          count: footerBlocks.length,
          content: <BlockList blocks={footerBlocks} />,
        },
      ]}
    />
  );
}

interface BlockListProps {
  blocks: ContentBlock[];
}

function BlockList({ blocks }: BlockListProps) {
  const toast = useToast();

  function handleSave(block: ContentBlock) {
    toast.success(`"${block.label}" saved`);
  }

  return (
    <ul className="space-y-3">
      {blocks.map((block) => (
        <li
          key={block.id}
          className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                {block.id}
              </p>
              <p className="text-sm font-semibold text-[var(--color-ink-900)]">{block.label}</p>
              {block.description && (
                <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{block.description}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => handleSave(block)} type="button">
              Save
            </Button>
          </div>
          <div className="mt-3">
            {block.isMultiline ? (
              <TextArea label="Content" defaultValue={block.value} rows={3} />
            ) : (
              <TextField label="Content" defaultValue={block.value} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

interface FaqListProps {
  entries: FaqEntry[];
}

function FaqList({ entries }: FaqListProps) {
  const toast = useToast();
  const [editing, setEditing] = useState<FaqEntry | "new" | null>(null);
  const [deleting, setDeleting] = useState<FaqEntry | null>(null);

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-[var(--color-ink-500)]">
          Drag the handle to reorder. Reordering is read-only in the demo.
        </p>
        <Button
          variant="primary"
          size="sm"
          leadingIcon={<Plus size={14} />}
          onClick={() => setEditing("new")}
        >
          Add FAQ
        </Button>
      </div>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3"
          >
            <span
              aria-label="Drag handle"
              className="mt-1 cursor-grab text-[var(--color-ink-400)]"
            >
              <GripVertical size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                {entry.question}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-600)]">
                {entry.answer}
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="Edit FAQ"
                onClick={() => setEditing(entry)}
                className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                aria-label="Delete FAQ"
                onClick={() => setDeleting(entry)}
                className="grid size-8 place-items-center rounded-[var(--radius-md)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Drawer
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add FAQ" : "Edit FAQ"}
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
                toast.success(editing === "new" ? "FAQ added" : "FAQ saved");
                setEditing(null);
              }}
            >
              {editing === "new" ? "Add FAQ" : "Save FAQ"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextField
            label="Question"
            defaultValue={typeof editing === "object" ? editing?.question : ""}
          />
          <TextArea
            label="Answer"
            rows={5}
            defaultValue={typeof editing === "object" ? editing?.answer : ""}
          />
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Delete this FAQ?"
        message="This question will be removed from the FAQ list."
        tone="danger"
        confirmLabel="Delete FAQ"
        onConfirm={() => {
          if (deleting) toast.warn(`FAQ "${deleting.question}" deleted`);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
