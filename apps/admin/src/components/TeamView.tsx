"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusPill } from "@/components/StatusPill";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { ROLE_PERMISSIONS } from "@/lib/permissionsCatalog";
import { getInitials } from "@/lib/initials";
import { FIELD_LIMITS } from "@store/shared";
import type { AdminUser } from "@/types/admin";
import type { UserRole } from "@store/db";

/** RFC 5321 caps the local + domain parts at 320 chars combined. */
const EMAIL_MAX_CHARS = 320;
/** Reasonable upper bound on an admin password — long enough for passphrases. */
const PASSWORD_MAX_CHARS = 128;
/** Server enforces an 8-char floor via `validatePassword`. */
const PASSWORD_MIN_CHARS = 8;
/** Full name in the team form — caps at the same upper bound the server uses. */
const TEAM_NAME_MAX_CHARS = FIELD_LIMITS.shortText;

interface TeamViewProps {
  members: AdminUser[];
  currentUserId?: string;
  isCurrentUserSuperAdmin?: boolean;
}

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

const ROLE_TONE: Record<UserRole, "dark" | "accent" | "neutral"> = {
  owner: "dark",
  manager: "accent",
  staff: "neutral",
};

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as UserRole[]).map((role) => ({
  value: role,
  label: ROLE_LABEL[role],
}));

type DrawerState = { mode: "new" } | { mode: "edit"; member: AdminUser } | null;

export function TeamView({ members, currentUserId, isCurrentUserSuperAdmin }: TeamViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [removing, setRemoving] = useState<AdminUser | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleRemove() {
    if (!removing) {
      return;
    }
    try {
      await adminFetch(`/api/team/${removing.id}`, { method: "DELETE" });
      toast.warn(`${removing.name} removed`);
      setRemoving(null);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to remove member");
    }
  }

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: "member",
      header: "Member",
      cell: (member) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-ink-900)] text-[11px] font-semibold text-white">
            {getInitials(member.name)}
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
          <StatusPill tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</StatusPill>
          {member.isSuperAdmin ? <StatusPill tone="dark">Super</StatusPill> : null}
          {!member.isActive ? <StatusPill tone="warn">Suspended</StatusPill> : null}
        </div>
      ),
    },
    {
      id: "joined",
      header: "Joined",
      hideOnMobile: true,
      cell: (member) => (
        <span className="text-xs text-[var(--color-ink-600)]">
          {new Date(member.createdAt).toLocaleDateString("en-PK", {
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
          {member.lastSignInAt
            ? new Date(member.lastSignInAt).toLocaleString("en-PK", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
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
            onClick={() => setDrawer({ mode: "edit", member })}
            className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <Pencil size={13} />
          </button>
          {member.id !== currentUserId && !member.isSuperAdmin ? (
            <button
              type="button"
              aria-label="Remove member"
              onClick={() => setRemoving(member)}
              className="grid size-8 place-items-center rounded-[var(--radius-md)] text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
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
          searchAccessor={(member) =>
            `${member.name} ${member.email} ${ROLE_LABEL[member.role]} ${member.phoneNumber ?? ""}`
          }
          searchPlaceholder="Search team…"
          toolbar={
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Plus size={14} />}
              onClick={() => setDrawer({ mode: "new" })}
            >
              Invite member
            </Button>
          }
        />
      </div>

      <aside className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5">
        <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Roles & permissions</h2>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          What each role can do in the admin console.
        </p>
        <ul className="mt-4 space-y-4">
          {(Object.keys(ROLE_LABEL) as UserRole[]).map((role) => (
            <li key={role}>
              <StatusPill tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</StatusPill>
              <ul className="mt-2 space-y-1 text-xs text-[var(--color-ink-700)]">
                {ROLE_PERMISSIONS[role].map((permission) => (
                  <li key={permission} className="flex items-start gap-2">
                    <span className="mt-1 size-1 shrink-0 rounded-full bg-[var(--color-ink-400)]" />
                    <span>{permission.replace(/_/g, " ")}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </aside>

      {drawer ? (
        <TeamDrawer
          state={drawer}
          isCurrentUserSuperAdmin={Boolean(isCurrentUserSuperAdmin)}
          onClose={() => setDrawer(null)}
          onSaved={() => {
            setDrawer(null);
            refresh();
          }}
        />
      ) : null}

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
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

interface TeamDrawerProps {
  state: { mode: "new" } | { mode: "edit"; member: AdminUser };
  isCurrentUserSuperAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function TeamDrawer({ state, isCurrentUserSuperAdmin, onClose, onSaved }: TeamDrawerProps) {
  const toast = useToast();
  const isEdit = state.mode === "edit";
  const initial = isEdit ? state.member : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const [role, setRole] = useState<UserRole>(initial?.role ?? "staff");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initial?.isSuperAdmin ?? false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payloadBase: Record<string, unknown> = {
        name,
        email,
        phoneNumber: phoneNumber || undefined,
        role,
        isActive,
      };
      if (isCurrentUserSuperAdmin) {
        payloadBase.isSuperAdmin = isSuperAdmin;
      }
      if (password) {
        payloadBase.password = password;
      }

      if (isEdit && initial) {
        await adminFetch(`/api/team/${initial.id}`, { method: "PUT", json: payloadBase });
        toast.success("Member updated");
      } else {
        if (!password) {
          throw new Error("Password is required for new members.");
        }
        await adminFetch(`/api/team`, { method: "POST", json: payloadBase });
        toast.success("Invitation created");
      }
      onSaved();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save member");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={isEdit ? "Edit team member" : "Invite team member"}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="team-form"
            isLoading={isSaving}
          >
            {isEdit ? "Save changes" : "Create member"}
          </Button>
        </div>
      }
    >
      <form id="team-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={TEAM_NAME_MAX_CHARS}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={EMAIL_MAX_CHARS}
        />
        <TextField
          label="Phone number"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          maxLength={FIELD_LIMITS.phoneNumber}
        />
        <SelectField
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          options={ROLE_OPTIONS}
        />
        <TextField
          label={isEdit ? "Reset password (optional)" : "Initial password"}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required={!isEdit}
          minLength={PASSWORD_MIN_CHARS}
          maxLength={PASSWORD_MAX_CHARS}
          hint="Minimum 8 characters with at least one letter and one number."
        />
        <Switch
          label="Active"
          description="Suspended members cannot sign in."
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        {isCurrentUserSuperAdmin ? (
          <Switch
            label="Super admin"
            description="Bypass all role-based permission checks."
            checked={isSuperAdmin}
            onCheckedChange={setIsSuperAdmin}
          />
        ) : null}
      </form>
    </Drawer>
  );
}
