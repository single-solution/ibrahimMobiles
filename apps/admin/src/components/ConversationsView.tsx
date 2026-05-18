"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bot, MessageSquare, User, UserCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Drawer } from "@/components/Drawer";
import { StatusPill } from "@/components/StatusPill";
import { TextArea } from "@/components/forms/TextArea";
import { useToast } from "@/components/Toast";
import { adminFetch } from "@/lib/adminApi";
import { classNames } from "@store/shared";
import type {
  AdminConversation,
  AdminConversationMessage,
  AdminConversationSummary,
} from "@/types/admin";

interface ConversationsViewProps {
  conversations: AdminConversationSummary[];
}

const STATUS_TONE: Record<AdminConversationSummary["status"], "info" | "success" | "warn"> = {
  open: "info",
  resolved: "success",
  waiting: "warn",
};

const PRIORITY_LABEL: Record<AdminConversationSummary["priority"], string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export function ConversationsView({ conversations }: ConversationsViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [active, setActive] = useState<AdminConversationSummary | null>(null);
  const [detail, setDetail] = useState<AdminConversation | null>(null);
  const [reply, setReply] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Closing the drawer is a single user action — clear every dependent piece
  // of state in one place so the effect below only owns the "load detail on
  // open" responsibility (and doesn't trigger react-hooks/set-state-in-effect).
  function closeActive() {
    setActive(null);
    setDetail(null);
    setReply("");
  }

  useEffect(() => {
    if (!active) {
      return;
    }

    let isCancelled = false;
    const conversationId = active.id;
    async function loadDetail() {
      try {
        const data = await adminFetch<AdminConversation>(`/api/conversations/${conversationId}`);
        if (!isCancelled) {
          setDetail(data);
        }
      } catch (error) {
        if (!isCancelled) {
          toast.danger(error instanceof Error ? error.message : "Failed to load conversation");
        }
      }
    }
    void loadDetail();

    return () => {
      isCancelled = true;
    };
  }, [active, toast]);

  function refresh() {
    router.refresh();
  }

  async function handleStatusChange(next: AdminConversationSummary["status"]) {
    if (!active) {
      return;
    }
    try {
      const updated = await adminFetch<AdminConversation>(
        `/api/conversations/${active.id}`,
        { method: "PUT", json: { status: next } },
      );
      setDetail(updated);
      toast.success(`Status set to ${next}`);
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to update status");
    }
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || !reply.trim()) {
      return;
    }
    setIsSending(true);
    try {
      const updated = await adminFetch<AdminConversation>(
        `/api/conversations/${active.id}/messages`,
        { method: "POST", json: { body: reply, author: "agent" } },
      );
      setDetail(updated);
      setReply("");
      toast.success("Reply sent");
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  }

  const columns: DataTableColumn<AdminConversationSummary>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (conversation) => (
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">
            {conversation.customerName}
          </p>
          <p className="text-[11px] text-[var(--color-ink-500)]">
            {conversation.channel} · {PRIORITY_LABEL[conversation.priority]}
          </p>
        </div>
      ),
    },
    {
      id: "topic",
      header: "Topic",
      cell: (conversation) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--color-ink-800)]">
            {conversation.topic}
          </p>
          <p className="line-clamp-1 text-[11px] text-[var(--color-ink-500)]">
            {conversation.lastMessagePreview ?? "No messages yet"}
          </p>
        </div>
      ),
    },
    {
      id: "unread",
      header: "Unread",
      align: "center",
      hideOnMobile: true,
      cell: (conversation) => (
        <span className="text-sm font-semibold text-[var(--color-ink-800)]">
          {conversation.unreadCount}
        </span>
      ),
    },
    {
      id: "last",
      header: "Last reply",
      hideOnMobile: true,
      cell: (conversation) => (
        <span className="text-xs text-[var(--color-ink-500)]">
          {new Date(conversation.lastMessageAt).toLocaleString("en-PK", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (conversation) => (
        <StatusPill tone={STATUS_TONE[conversation.status]}>
          {conversation.status.charAt(0).toUpperCase() + conversation.status.slice(1)}
        </StatusPill>
      ),
    },
  ];

  return (
    <>
      <DataTable
        rows={conversations}
        columns={columns}
        rowKey={(conversation) => conversation.id}
        searchAccessor={(conversation) =>
          `${conversation.customerName} ${conversation.topic} ${conversation.lastMessagePreview ?? ""}`
        }
        searchPlaceholder="Search conversations…"
        onRowClick={(conversation) => setActive(conversation)}
      />

      <Drawer
        isOpen={active !== null}
        onClose={closeActive}
        title={active?.customerName ?? ""}
        description={active?.topic}
        width="lg"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<UserCog size={12} />}
              onClick={() => handleStatusChange("waiting")}
            >
              Mark waiting
            </Button>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<MessageSquare size={12} />}
              onClick={() => handleStatusChange("resolved")}
            >
              Resolve
            </Button>
          </div>
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {detail.messages.length === 0 ? (
                <p className="rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-3 text-sm text-[var(--color-ink-500)]">
                  No messages yet.
                </p>
              ) : (
                detail.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
            </div>
            <form onSubmit={handleReply} className="space-y-2">
              <TextArea
                label="Send a reply"
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={3}
                placeholder="Type your message…"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSending}
                  disabled={!reply.trim()}
                  leadingIcon={<MessageSquare size={12} />}
                >
                  Send reply
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] p-3 text-sm text-[var(--color-ink-500)]">
            Loading conversation…
          </p>
        )}
      </Drawer>
    </>
  );
}

interface MessageBubbleProps {
  message: AdminConversationMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isCustomer = message.author === "customer";
  const labels: Record<AdminConversationMessage["author"], string> = {
    customer: "Customer",
    ai: "AI assistant",
    agent: "Team agent",
  };
  const icons: Record<AdminConversationMessage["author"], React.ReactNode> = {
    customer: <User size={12} />,
    ai: <Bot size={12} />,
    agent: <UserCog size={12} />,
  };
  return (
    <div className={classNames("flex flex-col gap-1", isCustomer ? "items-start" : "items-end")}>
      <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {icons[message.author]}
        {labels[message.author]}
        <span className="font-medium normal-case tracking-normal text-[var(--color-ink-400)]">
          ·{" "}
          {new Date(message.createdAt).toLocaleTimeString("en-PK", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </p>
      <div
        className={classNames(
          "max-w-[85%] whitespace-pre-line rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm",
          isCustomer
            ? "bg-[var(--color-canvas-deep)] text-[var(--color-ink-800)]"
            : message.author === "ai"
              ? "bg-[var(--color-accent-700)] text-white"
              : "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]",
        )}
      >
        {message.body}
      </div>
    </div>
  );
}
