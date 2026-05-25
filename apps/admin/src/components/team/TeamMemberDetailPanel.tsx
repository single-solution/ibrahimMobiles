"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Copy,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/StatusPill";
import { TabList } from "@/components/Tabs";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { Switch } from "@/components/forms/Switch";
import { WorkspaceDetailHeader } from "@/components/workspace/adminWorkspaceUi";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { getInitials } from "@/lib/initials";
import { formatActivityAction } from "@/lib/activityLabels";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABEL,
  ROLE_OPTIONS,
  ROLE_TAGLINE,
  ROLE_TONE,
  rolePermissionCount,
} from "@/lib/roleCatalog";
import { FIELD_LIMITS, classNames, formatTimeAgo } from "@store/shared";
import type {
  AdminActivityEntry,
  AdminUser,
} from "@/types/admin";
import type { UserRole } from "@store/db";

import { TeamErrorBanner, TeamStatCard, type TeamMemberTab } from "./teamDetailUi";

const EMAIL_MAX_CHARS = 320;
const PASSWORD_MAX_CHARS = 128;
const PASSWORD_MIN_CHARS = 8;
const NAME_MAX_CHARS = FIELD_LIMITS.shortText;
const RECENT_ACTIVITY_LIMIT = 30;

interface ActivityListResponse {
  items: AdminActivityEntry[];
  total: number;
}

export interface TeamMemberDetailPanelProps {
  memberId: string;
  currentUserId: string;
  canUpdate: boolean;
  canRemove: boolean;
  canViewActivity: boolean;
  isCurrentUserSuperAdmin: boolean;
  onBack: () => void;
  onDelete: (member: AdminUser) => void;
  onSaved: (member: AdminUser) => void;
  onOpenRoles: (role: UserRole) => void;
}

export function TeamMemberDetailPanel({
  memberId,
  currentUserId,
  canUpdate,
  canRemove,
  canViewActivity,
  isCurrentUserSuperAdmin,
  onBack,
  onDelete,
  onSaved,
  onOpenRoles,
}: TeamMemberDetailPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TeamMemberTab>("overview");
  const [member, setMember] = useState<AdminUser | null>(null);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [role, setRole] = useState<UserRole>("support_staff");
  const [isActive, setIsActive] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAccessSaving, setIsAccessSaving] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const isSelf = member?.id === currentUserId;

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const requests: [
        Promise<AdminUser>,
        Promise<ActivityListResponse | null>,
      ] = [
        adminFetch<AdminUser>(`/api/team/${memberId}`),
        canViewActivity
          ? adminFetch<ActivityListResponse>(
              `/api/activity?actorId=${memberId}&limit=${RECENT_ACTIVITY_LIMIT}`,
            )
          : Promise.resolve(null),
      ];
      const [detail, activityRes] = await Promise.all(requests);
      setMember(detail);
      setActivity(activityRes?.items ?? []);
      setActivityTotal(activityRes?.total ?? 0);
      setName(detail.name);
      setEmail(detail.email);
      setPhoneNumber(detail.phoneNumber ?? "");
      setRole(detail.role);
      setIsActive(detail.isActive);
      setIsSuperAdmin(detail.isSuperAdmin);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load member");
    } finally {
      setIsLoading(false);
    }
  }, [canViewActivity, memberId]);

  useEffect(() => {
    scheduleStateUpdate(() => {
      void load();
    });
  }, [load]);

  async function copyMemberId() {
    if (!member) return;
    try {
      await navigator.clipboard.writeText(member.id);
      toast.success("User ID copied");
    } catch {
      toast.danger("Could not copy ID");
    }
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    if (!canUpdate || !member) return;
    setIsProfileSaving(true);
    setProfileError(null);
    try {
      const updated = await adminFetch<AdminUser>(`/api/team/${member.id}`, {
        method: "PUT",
        json: {
          name,
          email,
          phoneNumber: phoneNumber || undefined,
        },
      });
      setMember(updated);
      toast.success("Profile updated");
      onSaved(updated);
    } catch (error) {
      setProfileError(
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to save profile",
      );
    } finally {
      setIsProfileSaving(false);
    }
  }

  async function handleSaveAccess(event: FormEvent) {
    event.preventDefault();
    if (!canUpdate || !member) return;
    setIsAccessSaving(true);
    setAccessError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (!isSelf && isCurrentUserSuperAdmin && role !== member.role) {
        payload.role = role;
      }
      if (isActive !== member.isActive && !isSelf) {
        payload.isActive = isActive;
      }
      if (
        isCurrentUserSuperAdmin &&
        isSuperAdmin !== member.isSuperAdmin &&
        !(isSelf && member.isSuperAdmin && !isSuperAdmin)
      ) {
        payload.isSuperAdmin = isSuperAdmin;
      }
      if (Object.keys(payload).length === 0) {
        toast.warn("No access changes to save");
        return;
      }
      const updated = await adminFetch<AdminUser>(`/api/team/${member.id}`, {
        method: "PUT",
        json: payload,
      });
      setMember(updated);
      toast.success("Access updated");
      onSaved(updated);
    } catch (error) {
      setAccessError(
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to update access",
      );
    } finally {
      setIsAccessSaving(false);
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    if (!canUpdate || !member) return;
    if (!password) {
      setPasswordError("Enter a new password.");
      return;
    }
    setIsPasswordSaving(true);
    setPasswordError(null);
    try {
      await adminFetch(`/api/team/${member.id}`, {
        method: "PUT",
        json: { password },
      });
      setPassword("");
      toast.success("Password reset");
    } catch (error) {
      setPasswordError(
        error instanceof AdminApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to reset password",
      );
    } finally {
      setIsPasswordSaving(false);
    }
  }

  const tabs = useMemo(() => {
    if (!member) return [];
    return [
      { id: "overview" as const, label: "Overview" },
      { id: "profile" as const, label: "Profile" },
      { id: "access" as const, label: "Access" },
      ...(canViewActivity
        ? [{ id: "activity" as const, label: "Activity", count: activityTotal }]
        : []),
    ];
  }, [activityTotal, canViewActivity, member]);

  if (isLoading && !member) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-3 md:px-4">
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-[var(--color-ink-100)]/80" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-ink-100)]" />
              <div className="h-2.5 w-28 animate-pulse rounded bg-[var(--color-ink-100)]/70" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-ink-100)]/70"
              />
            ))}
          </div>
          <div className="h-32 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-ink-100)]/70" />
        </div>
      </div>
    );
  }

  if (loadError || !member) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <TeamErrorBanner message={loadError ?? "Team member not found"} />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<RefreshCw size={13} />}
            onClick={() => void load()}
          >
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to team
          </Button>
        </div>
      </div>
    );
  }

  const canRemoveThisMember =
    canRemove && !isSelf && !(member.isSuperAdmin && isCurrentUserSuperAdmin === false);
  const cannotRemoveReason = isSelf
    ? "You cannot remove your own account."
    : member.isSuperAdmin
      ? "Super admins must be demoted by another super admin before removal."
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceDetailHeader
        onBack={onBack}
        backLabel="Back to team"
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-ink-900)] text-[11px] font-semibold text-white">
              {getInitials(member.name)}
            </span>
            <span className="min-w-0 flex-1 truncate">{member.name}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</StatusPill>
            {member.isSuperAdmin ? (
              <StatusPill tone="dark" leadingIcon={<ShieldCheck size={10} />}>
                Super
              </StatusPill>
            ) : null}
            {!member.isActive ? <StatusPill tone="warn">Suspended</StatusPill> : null}
            {isSelf ? <StatusPill tone="info">You</StatusPill> : null}
          </span>
        }
        actions={
          <>
            {member.phoneNumber ? (
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<Phone size={12} />}
                onClick={() => {
                  window.location.href = `tel:${member.phoneNumber!.replace(/\s+/g, "")}`;
                }}
              >
                Call
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Mail size={12} />}
              onClick={() => {
                window.location.href = `mailto:${member.email}`;
              }}
            >
              Email
            </Button>
            {canRemove ? (
              <Button
                variant="danger"
                size="sm"
                leadingIcon={<Trash2 size={12} />}
                onClick={() => onDelete(member)}
                disabled={!canRemoveThisMember}
                title={cannotRemoveReason}
              >
                Remove
              </Button>
            ) : null}
          </>
        }
      />

      <TabList
        tabs={tabs}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as TeamMemberTab)}
        compact
        fillWhenFew={false}
        aria-label="Team member sections"
        className="shrink-0 bg-[var(--color-surface)] px-2"
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        {activeTab === "overview" ? (
          <OverviewTab
            member={member}
            activity={activity}
            activityTotal={activityTotal}
            canViewActivity={canViewActivity}
            onCopyId={() => void copyMemberId()}
            onOpenRoles={() => onOpenRoles(member.role)}
            onGoTab={setActiveTab}
          />
        ) : null}

        {activeTab === "profile" ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileError ? (
              <TeamErrorBanner
                message={profileError}
                onDismiss={() => setProfileError(null)}
              />
            ) : null}
            <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Profile
              </p>
              <p className="mb-3 text-xs text-[var(--color-ink-500)]">
                Personal contact info. Used inside the admin console — not shown to customers.
              </p>
              <div className="space-y-3">
                <TextField
                  label="Full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  disabled={!canUpdate}
                  maxLength={NAME_MAX_CHARS}
                  placeholder="As they sign emails"
                  autoComplete="name"
                />
                <TextField
                  label="Email (sign-in)"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={!canUpdate}
                  maxLength={EMAIL_MAX_CHARS}
                  placeholder="teammate@yourstore.com"
                  autoComplete="email"
                  inputMode="email"
                  hint="Changing this updates the address they use to sign in."
                />
                <TextField
                  label="Phone number"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  disabled={!canUpdate}
                  maxLength={FIELD_LIMITS.phoneNumber}
                  placeholder="+92 320 4862403"
                  autoComplete="tel"
                  inputMode="tel"
                  hint="Optional — only visible to other admins."
                />
              </div>
              {canUpdate ? (
                <div className="mt-4 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isProfileSaving}
                  >
                    Save profile
                  </Button>
                </div>
              ) : null}
            </section>
          </form>
        ) : null}

        {activeTab === "access" ? (
          <div className="space-y-4">
            <form onSubmit={handleSaveAccess} className="space-y-3">
              {accessError ? (
                <TeamErrorBanner
                  message={accessError}
                  onDismiss={() => setAccessError(null)}
                />
              ) : null}
              <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                      Role & access
                    </p>
                    <p className="text-xs text-[var(--color-ink-500)]">
                      Controls what this teammate can see and do across the admin.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon={<ShieldCheck size={12} />}
                    onClick={() => onOpenRoles(role)}
                    type="button"
                  >
                    Compare roles
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  <SelectField
                    label="Role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as UserRole)}
                    options={ROLE_OPTIONS}
                    disabled={!canUpdate || !isCurrentUserSuperAdmin || isSelf}
                    hint={
                      isSelf
                        ? "You cannot change your own role."
                        : !isCurrentUserSuperAdmin
                          ? "Only super admins can change roles."
                          : ROLE_TAGLINE[role]
                    }
                  />
                  <RoleSummaryCard role={role} onOpen={() => onOpenRoles(role)} />
                  <Switch
                    label="Active"
                    description={
                      isSelf
                        ? "You cannot deactivate your own account."
                        : "Suspended members cannot sign in. Their sessions are dropped on next request."
                    }
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={!canUpdate || isSelf}
                  />
                  {isCurrentUserSuperAdmin ? (
                    <Switch
                      label="Super admin"
                      description={
                        isSelf && member.isSuperAdmin
                          ? "You cannot revoke your own super-admin status."
                          : "Bypasses all role-based permission checks. Grant sparingly."
                      }
                      checked={isSuperAdmin}
                      onCheckedChange={setIsSuperAdmin}
                      disabled={
                        !canUpdate ||
                        (isSelf && member.isSuperAdmin && !isSuperAdmin)
                      }
                    />
                  ) : null}
                </div>
                {canUpdate ? (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isAccessSaving}
                    >
                      Save access
                    </Button>
                  </div>
                ) : null}
              </section>
            </form>

            {canUpdate ? (
              <form onSubmit={handleResetPassword} className="space-y-3">
                {passwordError ? (
                  <TeamErrorBanner
                    message={passwordError}
                    onDismiss={() => setPasswordError(null)}
                  />
                ) : null}
                <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
                  <div className="flex items-center gap-2">
                    <KeyRound size={14} className="text-[var(--color-accent-700)]" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                      Reset password
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                    Set a new password for {member.name}. Share it with them securely — they
                    can change it after sign-in.
                  </p>
                  <div className="mt-3 space-y-3">
                    <TextField
                      label="New password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={PASSWORD_MIN_CHARS}
                      maxLength={PASSWORD_MAX_CHARS}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      hint="Must be 8+ chars with at least one letter and one number."
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      isLoading={isPasswordSaving}
                      disabled={!password}
                    >
                      Reset password
                    </Button>
                  </div>
                </section>
              </form>
            ) : null}

            <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-4">
              <div className="flex items-start gap-2">
                <ShieldAlert size={14} className="mt-0.5 text-[var(--color-ink-500)]" />
                <div className="text-xs text-[var(--color-ink-600)]">
                  <p className="font-semibold text-[var(--color-ink-800)]">Security notes</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    <li>Sessions refresh automatically on every change here — no logout needed.</li>
                    <li>Role and super-admin changes require super-admin authority on your side.</li>
                    <li>Removing the last super admin is blocked. Promote someone first.</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === "activity" && canViewActivity ? (
          <ActivityTab entries={activity} />
        ) : null}
      </div>
    </div>
  );
}

function OverviewTab({
  member,
  activity,
  activityTotal,
  canViewActivity,
  onCopyId,
  onOpenRoles,
  onGoTab,
}: {
  member: AdminUser;
  activity: AdminActivityEntry[];
  activityTotal: number;
  canViewActivity: boolean;
  onCopyId: () => void;
  onOpenRoles: () => void;
  onGoTab: (tab: TeamMemberTab) => void;
}) {
  const lastSignIn = member.lastSignInAt
    ? formatTimeAgo(member.lastSignInAt)
    : "Never";
  const memberSince = new Date(member.createdAt).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const totalPerms = rolePermissionCount(member.role);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <TeamStatCard label="Last sign-in" value={lastSignIn} />
        <TeamStatCard label="Member since" value={memberSince} />
        <TeamStatCard
          label="Permissions"
          value={`${totalPerms}`}
          sub={`${ROLE_LABEL[member.role]} role`}
        />
      </div>

      <RoleSummaryCard role={member.role} onOpen={onOpenRoles} />

      <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Account
        </p>
        <ul className="mt-3 space-y-2 text-xs text-[var(--color-ink-700)]">
          <li className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--color-ink-500)]">User ID</span>
            <code className="rounded bg-[var(--color-canvas-deep)] px-1.5 py-0.5 font-mono text-[10px]">
              {member.id}
            </code>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Copy size={11} />}
              onClick={onCopyId}
            >
              Copy
            </Button>
          </li>
          <li>
            <span className="text-[var(--color-ink-500)]">Sign-in email</span>
            <span className="ml-2">{member.email}</span>
          </li>
          {member.phoneNumber ? (
            <li>
              <span className="text-[var(--color-ink-500)]">Phone</span>
              <span className="ml-2">{member.phoneNumber}</span>
            </li>
          ) : null}
          <li>
            <span className="text-[var(--color-ink-500)]">Profile updated</span>
            <span className="ml-2">{formatTimeAgo(member.updatedAt)}</span>
          </li>
        </ul>
      </section>

      {canViewActivity ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Recent activity
            </p>
            {activityTotal > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => onGoTab("activity")}>
                View all ({activityTotal})
              </Button>
            ) : null}
          </div>
          <ActivityList entries={activity.slice(0, 5)} compact />
        </section>
      ) : null}
    </div>
  );
}

function RoleSummaryCard({
  role,
  onOpen,
}: {
  role: UserRole;
  onOpen: () => void;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-3 md:p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
          <ShieldCheck size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-[13px] font-semibold text-[var(--color-ink-900)]">
              {ROLE_LABEL[role]}
            </h4>
            <StatusPill tone={ROLE_TONE[role]}>{ROLE_TAGLINE[role]}</StatusPill>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-ink-600)]">
            {ROLE_DESCRIPTIONS[role]}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpen} type="button">
          See permissions
        </Button>
      </div>
    </section>
  );
}

function ActivityTab({ entries }: { entries: AdminActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
        No activity recorded yet. Actions appear here as soon as this member starts using the
        admin.
      </p>
    );
  }
  return <ActivityList entries={entries} />;
}

function ActivityList({
  entries,
  compact,
}: {
  entries: AdminActivityEntry[];
  compact?: boolean;
}) {
  if (entries.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] px-4 py-6 text-center text-xs text-[var(--color-ink-500)]">
        Nothing yet.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={classNames(
            "rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2 text-xs",
            compact && "py-1.5",
          )}
        >
          <p className="font-semibold text-[var(--color-ink-900)]">
            {formatActivityAction(entry.action)} · {entry.resourceLabel || entry.resourceType}
          </p>
          <p className="text-[10px] text-[var(--color-ink-500)]">
            {entry.resourceType} · {formatTimeAgo(entry.createdAt)}
          </p>
          {entry.detail ? (
            <p className="mt-0.5 text-[var(--color-ink-700)]">{entry.detail}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
