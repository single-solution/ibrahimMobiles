"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { TextField } from "@/components/forms/TextField";
import { TextArea } from "@/components/forms/TextArea";
import { Switch } from "@/components/forms/Switch";
import { useToast } from "@/components/ui/Toast";
import { ApiError, apiFetch } from "@/lib/api";
import { FIELD_LIMITS } from "@store/shared";
import type { AdminCustomer } from "@/types/models";
import { CustomerErrorBanner } from "./customerDetailUi";

const EMAIL_MAX_CHARS = 320;

interface CustomerCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (customer: AdminCustomer) => void;
}

export function CustomerCreateDrawer({
  isOpen,
  onClose,
  onCreated,
}: CustomerCreateDrawerProps) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [isLoyaltyMember, setIsLoyaltyMember] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setPhoneNumber("");
    setEmail("");
    setCity("");
    setIsLoyaltyMember(false);
    setNotes("");
    setError(null);
  }

  function handleClose() {
    if (isSaving) return;
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const created = await apiFetch<AdminCustomer>("/api/customers", {
        method: "POST",
        json: {
          name,
          phoneNumber,
          email: email || undefined,
          city: city || undefined,
          isLoyaltyMember,
          notes: notes || undefined,
        },
      });
      toast.success(`${created.name} added`);
      reset();
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to create customer",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title="New customer"
      description="Set up an account for someone who can't self-register on the storefront. Their phone number is their sign-in ID."
      width="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="md" type="button" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            form="customer-create-form"
            isLoading={isSaving}
          >
            Create customer
          </Button>
        </div>
      }
    >
      <form id="customer-create-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <CustomerErrorBanner message={error} onDismiss={() => setError(null)} />
        ) : null}
        <TextField
          label="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={FIELD_LIMITS.personName}
          placeholder="As they want it on invoices"
          autoComplete="name"
        />
        <TextField
          label="Phone (sign-in ID)"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          required
          maxLength={FIELD_LIMITS.phoneNumber}
          placeholder="+92 320 4862403"
          inputMode="tel"
          autoComplete="tel"
          hint="The customer signs in with this number. They can't change it later from admin."
        />
        <TextField
          label="City"
          value={city}
          onChange={(event) => setCity(event.target.value)}
          maxLength={FIELD_LIMITS.city}
          placeholder="Optional"
          autoComplete="address-level2"
          hint="Optional — they can fill this in at checkout."
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={EMAIL_MAX_CHARS}
          placeholder="optional@example.com"
          inputMode="email"
          autoComplete="email"
          hint="Optional — used for order receipts when provided."
        />
        <Switch
          label="Loyalty member"
          description="Marks enrollment for programme rules; balance changes happen on the Loyalty tab."
          checked={isLoyaltyMember}
          onCheckedChange={setIsLoyaltyMember}
        />
        <TextArea
          label="Internal notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={2_000}
          placeholder="Why this account was created, context, etc."
        />
        <p className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-ink-600)]">
          After creating, open the profile and use <strong>Sign-in code</strong> to hand the
          customer a code they can enter on the storefront login.
        </p>
      </form>
    </Drawer>
  );
}
