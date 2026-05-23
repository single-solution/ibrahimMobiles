"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/forms/TextField";
import { useToast } from "@/components/Toast";
import { adminFetch, AdminApiError } from "@/lib/adminApi";
import { formatRole } from "@/lib/initials";
import { FIELD_LIMITS } from "@store/shared";
import type { AdminUser } from "@/types/admin";

const EMAIL_MAX_CHARS = 320;
const PASSWORD_MAX_CHARS = 128;
const PASSWORD_MIN_CHARS = 8;

const ROLE_LABEL: Record<AdminUser["role"], string> = {
  owner: "Owner",
  business_manager: "Business manager",
  product_manager: "Product manager",
  marketing_manager: "Marketing manager",
  support_staff: "Support staff",
};

export function AccountSettings() {
  const router = useRouter();
  const toast = useToast();
  const { data: session, update: updateSession } = useSession();

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminFetch<AdminUser>("/api/account")
      .then((account) => {
        if (cancelled) return;
        setName(account.name);
        setEmail(account.email);
        setPhoneNumber(account.phoneNumber ?? "");
        setRoleLabel(
          account.isSuperAdmin
            ? "Owner"
            : ROLE_LABEL[account.role] ?? formatRole(account.role),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        toast.danger(
          error instanceof AdminApiError
            ? error.message
            : "Failed to load your account.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    try {
      const updated = await adminFetch<AdminUser>("/api/account", {
        method: "PUT",
        json: {
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim() || undefined,
        },
      });
      await updateSession({
        name: updated.name,
        email: updated.email,
      });
      toast.success("Profile updated.");
      router.refresh();
    } catch (error) {
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : "Failed to update profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordSaving) return;
    if (password !== passwordConfirm) {
      toast.danger("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await adminFetch("/api/account", {
        method: "PUT",
        json: { password },
      });
      setPassword("");
      setPasswordConfirm("");
      toast.success("Password updated.");
    } catch (error) {
      toast.danger(
        error instanceof AdminApiError
          ? error.message
          : "Failed to update password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-500)]">Loading account…</p>;
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
        <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Profile</h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
          Update how you appear in the admin console.
        </p>
        <form onSubmit={handleProfileSubmit} className="mt-4 space-y-4">
          <TextField
            label="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={FIELD_LIMITS.shortText}
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
          <p className="text-xs text-[var(--color-ink-500)]">
            Role:{" "}
            <span className="font-semibold text-[var(--color-ink-800)]">
              {roleLabel}
            </span>
            {session?.user?.isSuperAdmin ? null : (
              <span className="block pt-0.5">
                Contact an owner to change your role or access level.
              </span>
            )}
          </p>
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={profileSaving}
            >
              Save profile
            </Button>
          </div>
        </form>
      </section>

      <section
        id="password"
        className="scroll-mt-4 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]"
      >
        <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Password</h2>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
          Choose a new password for signing in to the admin console.
        </p>
        <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
          <TextField
            label="New password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={PASSWORD_MIN_CHARS}
            maxLength={PASSWORD_MAX_CHARS}
            autoComplete="new-password"
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            required
            minLength={PASSWORD_MIN_CHARS}
            maxLength={PASSWORD_MAX_CHARS}
            autoComplete="new-password"
            hint="Minimum 8 characters with at least one letter and one number."
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={passwordSaving}
            >
              Update password
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
