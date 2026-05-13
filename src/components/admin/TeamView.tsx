"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusPill } from "@/components/admin/StatusPill";
import { TextField } from "@/components/admin/forms/TextField";
import { SelectField } from "@/components/admin/forms/SelectField";
import { useToast } from "@/components/admin/Toast";
import type { TeamMember, TeamRole } from "@/data/admin/adminTeam";

interface TeamViewProps {
  members: TeamMember[];
  permissions: Record<TeamRole, string[]>;
}

const ROLE_TONE: Record<TeamRole, "dark" | "accent" | "info" | "neutral"> = {
  Owner: "dark",
  Manager: "accent",
  Editor: "info",
  Viewer: "neutral",
};

export function TeamView({ members, permissions }: TeamViewProps) {
  const toast = useToast();
  const [editing, setEditing] = useState<TeamMember | "new" | null>(null);
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  const columns: DataTableColumn<TeamMember>[] = [
    {
      id: "member",
      header: "Member",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-ink-900)] text-[11px] font-semibold text-white">
            {member.initials}
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-ink-900)]">{member.name}</p>
            <p className="text-[11px] text-[var(--color-ink-500)]">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (member) => (
        <div className="flex items-center gap-1.5">
          <StatusPill tone={ROLE_TONE[member.role]}>{member.role}</StatusPill>
          {member.isPending && <StatusPill tone="warn">Pending</StatusPill>}
        </div>
      ),
    },
    {
      id: "joined",
      header: "Joined",
      hideOnMobile: true,
      cell: (member) => (
        <span className="text-xs text-[var(--color-ink-600)]">
          {new Date(member.joinedAt).toLocaleDateString("en-PK", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "active",
      header: "Last active",
      hideOnMobile: true,
      cell: (member) => (
        <span className="text-xs text-[var(--color-ink-500)]">
          {new Date(member.lastActiveAt).toLocaleString("en-PK", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      width: "100px",
      cell: (member) => (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit member"
            onClick={() => setEditing(member)}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <Pencil size={13} />
          </button>
          {member.role !== "Owner" && (
            <button
              type="button"
              aria-label="Remove member"
              onClick={() => setRemoving(member)}
              className="grid size-8 place-items-center rounded-[var(--radius-md)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div>
        <DataTable
          rows={members}
          columns={columns}
          rowKey={(member) => member.id}
          searchAccessor={(member) => `${member.name} ${member.email} ${member.role}`}
          searchPlaceholder="Search team…"
          toolbar={
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={14} />}
              onClick={() => setEditing("new")}
            >
              Invite member
            </Button>
          }
        />
      </div>

      <aside className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Roles & permissions</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          A summary of what each role can do in the admin.
        </p>
        <ul className="mt-4 space-y-4">
          {(Object.keys(permissions) as TeamRole[]).map((role) => (
            <li key={role}>
              <StatusPill tone={ROLE_TONE[role]}>{role}</StatusPill>
              <ul className="mt-2 space-y-1 text-xs text-[var(--color-ink-700)]">
                {permissions[role].map((permission) => (
                  <li key={permission} className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-[var(--color-ink-400)]" />
                    <span>{permission}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </aside>

      <Drawer
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Invite team member" : "Edit team member"}
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
                toast.success(editing === "new" ? "Invitation sent" : "Member updated");
                setEditing(null);
              }}
            >
              {editing === "new" ? "Send invitation" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextField
            label="Full name"
            defaultValue={typeof editing === "object" ? editing?.name : ""}
            placeholder="Hira Bashir"
          />
          <TextField
            label="Email"
            type="email"
            defaultValue={typeof editing === "object" ? editing?.email : ""}
            placeholder="hira@ibrahimmobiles.pk"
          />
          <SelectField
            label="Role"
            defaultValue={typeof editing === "object" ? editing?.role : "Editor"}
            options={["Owner", "Manager", "Editor", "Viewer"].map((role) => ({
              value: role,
              label: role,
            }))}
          />
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={removing !== null}
        title="Remove team member?"
        message={
          <>
            <strong>{removing?.name}</strong> will lose access to the admin console immediately.
          </>
        }
        tone="danger"
        confirmLabel="Remove member"
        onConfirm={() => {
          if (removing) toast.warn(`${removing.name} removed`);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
