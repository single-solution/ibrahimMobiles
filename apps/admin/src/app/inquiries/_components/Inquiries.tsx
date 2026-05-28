"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { StatusPill } from "@/components/shared/StatusPill";
import { useNavigationTransition } from "@/lib/navigation/navigationProgress";
import { useToast } from "@/components/ui/Toast";
import {
  WorkspaceEmptyPane,
  WorkspaceFrame,
  WorkspacePaneHeader,
  WorkspaceSearchField,
} from "@/components/shared/adminWorkspaceUi";
import { adminFetch } from "@/lib/adminApi";
import { getInitials } from "@/lib/initials";
import { classNames, createChatTransport, formatTimeAgo } from "@store/shared";
import type { AdminInquirySummary, AdminUser } from "@/types/admin";
import type { InquiriesPageAccess } from "@/app/inquiries/page";
import type { PermissionKey } from "@/lib/permissionsCatalog";

import { InquiryConversationPanel } from "./inquiryConversationPanel";
import { STATUS_LABELS, STATUS_TONE } from "./inquiriesStatus";

const INQUIRY_POLL_FOCUSED_MS = 5_000;
const INQUIRY_POLL_BLURRED_MS = 30_000;

/**
 * Admin inquiries inbox — list, read, reply, assign, and resolve customer inquiries.
 * Actions are gated by role permissions (`inquiry_view`, `inquiry_reply`, `inquiry_manage`).
 */

interface InquiriesProps {
  inquiries: AdminInquirySummary[];
  access: InquiriesPageAccess;
}

interface TeamListResponse {
  items: AdminUser[];
}

function accessFlags(permissions: PermissionKey[]) {
  const set = new Set(permissions);
  return {
    canReply: set.has("inquiry_reply"),
    canManage: set.has("inquiry_manage"),
    canViewTeam: set.has("team_view"),
  };
}

export function Inquiries(props: InquiriesProps) {
  return (
    <Suspense fallback={null}>
      <InquiriesInner {...props} />
    </Suspense>
  );
}

function InquiriesInner({ inquiries, access }: InquiriesProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startNavigation } = useNavigationTransition();
  const toast = useToast();
  const flags = accessFlags(access.permissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [remoteInquiries, setRemoteInquiries] = useState(inquiries);
  const [teamById, setTeamById] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    scheduleStateUpdate(() => {
      setRemoteInquiries(inquiries);
    });
  }, [inquiries]);
  const [activeInquiryId, setActiveInquiryId] = useState<string | null>(null);

  const setActiveInquiryUrl = useCallback(
    (id: string | null) => {
      setActiveInquiryId(id);
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("inquiry", id);
      } else {
        params.delete("inquiry");
      }
      const query = params.toString();
      const url = query ? `/inquiries?${query}` : "/inquiries";
      startNavigation(() => router.replace(url, { scroll: false }));
    },
    [router, searchParams, startNavigation],
  );

  const clearActiveInquiry = useCallback(() => {
    setActiveInquiryUrl(null);
  }, [setActiveInquiryUrl]);

  const handleInquiryRead = useCallback((id: string) => {
    setRemoteInquiries((current) =>
      current.map((candidate) =>
        candidate.id === id ? { ...candidate, unreadByTeam: 0 } : candidate,
      ),
    );
  }, []);

  useEffect(() => {
    if (!flags.canManage && !flags.canViewTeam) {
      return;
    }
    let cancelled = false;
    async function loadTeam() {
      try {
        const data = await adminFetch<TeamListResponse>("/api/team?limit=200");
        if (cancelled) return;
        setTeamById(new Map(data.items.map((member) => [member.id, member.name])));
      } catch {
        // ignore — assignee names fall back to "Assigned"
      }
    }
    void loadTeam();
    return () => {
      cancelled = true;
    };
  }, [flags.canManage, flags.canViewTeam]);

  function assigneeLabel(userId?: string): string {
    if (!userId) return "Unassigned";
    return teamById.get(userId) ?? "Assigned";
  }

  const filteredInquiries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length === 0) {
      return remoteInquiries;
    }
    return remoteInquiries.filter((inquiry) =>
      `${inquiry.customerName} ${inquiry.phoneNumber} ${
        inquiry.subjectProductName ?? ""
      } ${inquiry.lastMessagePreview}`
        .toLowerCase()
        .includes(query),
    );
  }, [remoteInquiries, searchQuery]);

  const refreshInquiryInList = useCallback((updated: AdminInquirySummary) => {
    setRemoteInquiries((current) =>
      current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)),
    );
  }, []);

  useEffect(() => {
    scheduleStateUpdate(() => {
      const fromUrl = searchParams.get("inquiry");
      if (fromUrl && remoteInquiries.some((inquiry) => inquiry.id === fromUrl)) {
        setActiveInquiryId(fromUrl);
        return;
      }
      if (filteredInquiries.length === 0) {
        if (activeInquiryId !== null) {
          setActiveInquiryUrl(null);
        }
        return;
      }
      const activeStillVisible =
        activeInquiryId !== null &&
        filteredInquiries.some((inquiry) => inquiry.id === activeInquiryId);
      if (activeStillVisible) {
        return;
      }
      const preferDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      setActiveInquiryUrl(preferDesktop ? filteredInquiries[0].id : null);
    });
  }, [
    activeInquiryId,
    filteredInquiries,
    remoteInquiries,
    searchParams,
    setActiveInquiryUrl,
  ]);

  return (
    <WorkspaceFrame>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <ThreadListPane
          inquiries={filteredInquiries}
          activeId={activeInquiryId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={(id) => setActiveInquiryUrl(id)}
          assigneeLabel={assigneeLabel}
          hiddenOnMobile={Boolean(activeInquiryId)}
        />

        <section
          className={classNames(
            "flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--color-canvas)]",
            !activeInquiryId && "hidden lg:flex",
          )}
        >
          {activeInquiryId ? (
            <InquiryConversationPanel
              inquiryId={activeInquiryId}
              actorId={access.actorId}
              actorName={access.actorName}
              canReply={flags.canReply}
              canManage={flags.canManage}
              teamMembers={
                flags.canManage && flags.canViewTeam
                  ? [...teamById.entries()].map(([id, name]) => ({ id, name }))
                  : []
              }
              assigneeLabel={assigneeLabel}
              onBack={clearActiveInquiry}
              onRead={handleInquiryRead}
              onThreadUpdated={refreshInquiryInList}
              onDeleted={() => {
                setActiveInquiryUrl(null);
                router.refresh();
              }}
              onCallTapped={(phoneNumber: string) => {
                window.location.href = `tel:${phoneNumber.replace(/\s+/g, "")}`;
              }}
            />
          ) : (
            <WorkspaceEmptyPane
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a thread on the left to read messages and reply to customers."
            />
          )}
        </section>
      </div>
    </WorkspaceFrame>
  );
}

interface ThreadListPaneProps {
  inquiries: AdminInquirySummary[];
  activeId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: string) => void;
  assigneeLabel: (userId?: string) => string;
  hiddenOnMobile: boolean;
}

function ThreadListPane({
  inquiries,
  activeId,
  searchQuery,
  onSearchChange,
  onSelect,
  assigneeLabel,
  hiddenOnMobile,
}: ThreadListPaneProps) {
  return (
    <aside
      className={classNames(
        "flex w-full shrink-0 flex-col border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] lg:w-[min(340px,38%)] lg:max-w-sm lg:border-b-0 lg:border-r",
        hiddenOnMobile && "hidden lg:flex",
      )}
    >
      <WorkspacePaneHeader
        icon={MessageSquare}
        title="Inquiries"
        subtitle={`${inquiries.length} conversation${inquiries.length === 1 ? "" : "s"} (recent 200) · from storefront chat`}
        search={
          <WorkspaceSearchField
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="w-full"
          />
        }
      />

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {inquiries.length === 0 ? (
          <li className="px-4 py-8 text-center text-xs text-[var(--color-ink-500)]">
            {searchQuery.trim()
              ? "No conversations match your search."
              : "No conversations yet. Threads appear when customers use the storefront chat widget."}
          </li>
        ) : (
          inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <ThreadListItem
                inquiry={inquiry}
                isActive={inquiry.id === activeId}
                assigneeLabel={assigneeLabel}
                onSelect={() => onSelect(inquiry.id)}
              />
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}

function ThreadListItem({
  inquiry,
  isActive,
  assigneeLabel,
  onSelect,
}: {
  inquiry: AdminInquirySummary;
  isActive: boolean;
  assigneeLabel: (userId?: string) => string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={classNames(
        "tap flex w-full gap-3 border-b border-[var(--color-ink-100)] px-3 py-3 text-left transition-colors",
        isActive ? "bg-[var(--color-accent-50)]" : "hover:bg-[var(--color-canvas-deep)]",
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
        {getInitials(inquiry.customerName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
            {inquiry.customerName}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-[var(--color-ink-400)]">
            {formatTimeAgo(inquiry.lastMessageAt)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--color-ink-600)]">
          {inquiry.lastMessagePreview || "No messages yet"}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusPill tone={STATUS_TONE[inquiry.status]}>{STATUS_LABELS[inquiry.status]}</StatusPill>
          <span className="text-[10px] text-[var(--color-ink-500)]">
            {assigneeLabel(inquiry.assignedToUserId)}
          </span>
          {inquiry.unreadByTeam > 0 ? (
            <span className="rounded-full bg-[var(--color-danger-600)] px-1.5 py-0.5 text-[9px] font-semibold text-white">
              {inquiry.unreadByTeam}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
