"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Check,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { classNames } from "@store/shared";
import type { AccountAddress, AccountCustomer } from "@/lib/storefront/account";

const SAVED_FLASH_MS = 1_800;

interface ProfileViewProps {
  customer: AccountCustomer;
}

interface AddressDraft {
  label?: string;
  recipientName: string;
  phoneNumber: string;
  street?: string;
  area?: string;
  city: string;
  postalCode?: string;
  isDefault: boolean;
}

function toDraft(address: AccountAddress): AddressDraft {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phoneNumber: address.phoneNumber,
    street: address.street ?? "",
    area: address.area ?? "",
    city: address.city,
    postalCode: address.postalCode ?? "",
    isDefault: address.isDefault,
  };
}

export function ProfileView({ customer }: ProfileViewProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [city, setCity] = useState(customer.city);
  const [phone] = useState(customer.phoneNumber);

  const [addresses, setAddresses] = useState<AddressDraft[]>(
    customer.addresses.map(toDraft),
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAddresses, setIsSavingAddresses] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const [hasSavedAddresses, setHasSavedAddresses] = useState(false);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/storefront/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName.trim(), email: email.trim() || null, city: city.trim() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setProfileError(data.error ?? "Save failed.");
        return;
      }
      setHasSavedProfile(true);
      setTimeout(() => setHasSavedProfile(false), SAVED_FLASH_MS);
      router.refresh();
    } catch {
      setProfileError("Network error. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const persistAddresses = async (next: AddressDraft[]) => {
    setIsSavingAddresses(true);
    setAddressError(null);
    try {
      const response = await fetch("/api/storefront/account/addresses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setAddressError(data.error ?? "Save failed.");
        return false;
      }
      setHasSavedAddresses(true);
      setTimeout(() => setHasSavedAddresses(false), SAVED_FLASH_MS);
      router.refresh();
      return true;
    } catch {
      setAddressError("Network error. Please try again.");
      return false;
    } finally {
      setIsSavingAddresses(false);
    }
  };

  const handleAddAddress = () => {
    setAddresses((prev) => [
      ...prev,
      {
        recipientName: fullName,
        phoneNumber: phone,
        street: "",
        area: "",
        city: city,
        isDefault: prev.length === 0,
      },
    ]);
    setEditingIndex(addresses.length);
  };

  const handleRemoveAddress = async (index: number) => {
    const next = addresses.filter((_, i) => i !== index);
    if (addresses[index]?.isDefault && next.length > 0) {
      next[0].isDefault = true;
    }
    setAddresses(next);
    await persistAddresses(next);
  };

  const handleSaveAddress = async (index: number, draft: AddressDraft) => {
    const next = addresses.map((address, i) => (i === index ? draft : address));
    setAddresses(next);
    setEditingIndex(null);
    await persistAddresses(next);
  };

  const handleMakeDefault = async (index: number) => {
    const next = addresses.map((address, i) => ({ ...address, isDefault: i === index }));
    setAddresses(next);
    await persistAddresses(next);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <Link
        href="/account"
        className="cta-arrow tap inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"
      >
        <ArrowLeft size={13} />
        Back to account
      </Link>
      <div className="mt-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
          Profile
        </p>
        <h1 className="mt-1 font-headline text-[34px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[44px]">
          Your details
        </h1>
        <p className="mt-1 text-[13px] text-[var(--color-ink-500)] md:text-sm">
          Manage your contact information and saved addresses.
        </p>
      </div>

      <Card className="mt-5 p-4 md:mt-6 md:p-5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Contact
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field
            label="Full name"
            icon={<User size={14} />}
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
          />
          <Field
            label="Phone (verified)"
            icon={<Phone size={14} />}
            value={phone}
            onChange={() => {}}
            autoComplete="tel"
            inputMode="tel"
            disabled
          />
          <Field
            label="Email (optional)"
            icon={<Mail size={14} />}
            value={email}
            onChange={setEmail}
            autoComplete="email"
            inputMode="email"
          />
          <Field
            label="City"
            icon={<Building2 size={14} />}
            value={city}
            onChange={setCity}
            autoComplete="address-level2"
          />
        </div>
        {profileError && <ErrorBanner message={profileError} />}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11.5px] text-[var(--color-ink-500)]">
            We&rsquo;ll only use these to update you about your orders.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveProfile}
            isLoading={isSavingProfile}
            leadingIcon={hasSavedProfile ? <Check size={13} strokeWidth={3} /> : undefined}
            disabled={isSavingProfile || !fullName.trim() || !city.trim()}
          >
            {hasSavedProfile ? "Saved" : "Save changes"}
          </Button>
        </div>
      </Card>

      <div className="mt-5 flex items-end justify-between md:mt-6">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          Saved addresses
          {hasSavedAddresses && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
              <Check size={10} strokeWidth={3.2} />
              Saved
            </span>
          )}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddAddress}
          leadingIcon={<Plus size={13} />}
          disabled={isSavingAddresses}
        >
          Add address
        </Button>
      </div>
      {addressError && <ErrorBanner message={addressError} />}

      <ul className="mt-3 space-y-3">
        {addresses.length === 0 ? (
          <li>
            <Card className="p-6 text-center text-[12.5px] text-[var(--color-ink-500)]">
              No saved addresses yet — add one to speed up future checkouts.
            </Card>
          </li>
        ) : (
          addresses.map((address, index) => (
            <li key={index}>
              {editingIndex === index ? (
                <AddressEditor
                  draft={address}
                  onSave={(draft) => handleSaveAddress(index, draft)}
                  onCancel={() => setEditingIndex(null)}
                  isSaving={isSavingAddresses}
                />
              ) : (
                <AddressRow
                  address={address}
                  isDefault={address.isDefault}
                  onMakeDefault={() => handleMakeDefault(index)}
                  onEdit={() => setEditingIndex(index)}
                  onRemove={() => handleRemoveAddress(index)}
                  disableRemove={addresses.length <= 1}
                  isBusy={isSavingAddresses}
                />
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="mt-3 rounded-[var(--radius-md)] border border-rose-100 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800"
    >
      {message}
    </p>
  );
}

interface AddressRowProps {
  address: AddressDraft;
  isDefault: boolean;
  onMakeDefault: () => void;
  onEdit: () => void;
  onRemove: () => void;
  disableRemove: boolean;
  isBusy: boolean;
}

function AddressRow({
  address,
  isDefault,
  onMakeDefault,
  onEdit,
  onRemove,
  disableRemove,
  isBusy,
}: AddressRowProps) {
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-700)]">
          <MapPin size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14px] font-semibold text-[var(--color-ink-900)]">
              {address.recipientName}
            </p>
            {isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-100)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-accent-800)]">
                <Check size={10} strokeWidth={3.2} />
                Default
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--color-ink-600)]">
            {[address.street, address.area].filter(Boolean).join(", ")}
            <br />
            {address.city} · {address.phoneNumber}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!isDefault && (
          <Button variant="ghost" size="sm" onClick={onMakeDefault} disabled={isBusy}>
            Make default
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Pencil size={12} />}
          onClick={onEdit}
          disabled={isBusy}
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<Trash2 size={12} />}
          onClick={onRemove}
          disabled={isBusy || disableRemove}
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}

interface AddressEditorProps {
  draft: AddressDraft;
  onSave: (draft: AddressDraft) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function AddressEditor({ draft, onSave, onCancel, isSaving }: AddressEditorProps) {
  const [recipientName, setRecipientName] = useState(draft.recipientName);
  const [phoneNumber, setPhoneNumber] = useState(draft.phoneNumber);
  const [street, setStreet] = useState(draft.street ?? "");
  const [area, setArea] = useState(draft.area ?? "");
  const [city, setCity] = useState(draft.city);
  const [postalCode, setPostalCode] = useState(draft.postalCode ?? "");

  const isValid =
    recipientName.trim() && phoneNumber.trim() && street.trim() && city.trim();

  return (
    <Card className="p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label="Full name"
          icon={<User size={14} />}
          value={recipientName}
          onChange={setRecipientName}
        />
        <Field
          label="Phone"
          icon={<Phone size={14} />}
          value={phoneNumber}
          onChange={setPhoneNumber}
          inputMode="tel"
        />
        <div className="md:col-span-2">
          <Field
            label="Street / house"
            icon={<Building2 size={14} />}
            value={street}
            onChange={setStreet}
            placeholder="House #, Street"
          />
        </div>
        <div className="md:col-span-2">
          <Field
            label="Area / sector (optional)"
            value={area}
            onChange={setArea}
            placeholder="Sector / Block"
          />
        </div>
        <Field label="City" value={city} onChange={setCity} />
        <Field
          label="Postcode (optional)"
          value={postalCode}
          onChange={setPostalCode}
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          isLoading={isSaving}
          onClick={() =>
            onSave({
              recipientName: recipientName.trim(),
              phoneNumber: phoneNumber.trim(),
              street: street.trim() || undefined,
              area: area.trim() || undefined,
              city: city.trim(),
              postalCode: postalCode.trim() || undefined,
              isDefault: draft.isDefault,
            })
          }
          disabled={!isValid || isSaving}
        >
          Save address
        </Button>
      </div>
    </Card>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  disabled?: boolean;
}

function Field({
  label,
  value,
  onChange,
  icon,
  autoComplete,
  inputMode,
  placeholder,
  disabled,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {label}
      </span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]">
            {icon}
          </span>
        )}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          disabled={disabled}
          className={classNames(
            "h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] text-sm text-[var(--color-ink-900)] transition-colors placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)]/30 disabled:cursor-not-allowed disabled:bg-[var(--color-canvas-deep)] disabled:text-[var(--color-ink-500)]",
            icon ? "pl-9 pr-3" : "px-3.5",
          )}
        />
      </span>
    </label>
  );
}
