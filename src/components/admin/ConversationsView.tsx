"use client";

import { useState } from "react";
import { Bot, MessageSquare, User, UserCog } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { Drawer } from "@/components/admin/Drawer";
import { StatusPill } from "@/components/admin/StatusPill";
import { useToast } from "@/components/admin/Toast";
import {
  type AdminConversation,
  type ConversationParticipant,
} from "@/data/admin/conversations";
import { classNames } from "@/lib/utils";

interface ConversationsViewProps {
  conversations: AdminConversation[];
}

const STATUS_TONE: Record<AdminConversation["status"], "info" | "success" | "warn"> = {
  open: "info",
  resolved: "success",
  "handed-off": "warn",
};

export function ConversationsView({ conversations }: ConversationsViewProps) {
  const toast = useToast();
  const [active, setActive] = useState<AdminConversation | null>(null);

  const columns: DataTableColumn<AdminConversation>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (conversation) => (
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink-900)]">
            {conversation.customerName}
          </p>
          <p className="text-[11px] text-[var(--color-ink-500)]">
            {conversation.customerCity}
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
            {conversation.preview}
          </p>
        </div>
      ),
    },
    {
      id: "messages",
      header: "Messages",
      align: "center",
      hideOnMobile: true,
      cell: (conversation) => (
        <span className="text-sm font-semibold text-[var(--color-ink-800)]">
          {conversation.messageCount}
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
          {conversation.status === "handed-off"
            ? "Handed off"
            : conversation.status.charAt(0).toUpperCase() + conversation.status.slice(1)}
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
          `${conversation.customerName} ${conversation.topic} ${conversation.preview}`
        }
        searchPlaceholder="Search conversations…"
        onRowClick={(conversation) => setActive(conversation)}
      />

      <Drawer
        isOpen={active !== null}
        onClose={() => setActive(null)}
        title={active?.customerName ?? ""}
        description={active?.topic}
        width="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<UserCog size={12} />}
              onClick={() => toast.success("Conversation handed off to Hira")}
            >
              Hand off to agent
            </Button>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<MessageSquare size={12} />}
              onClick={() => {
                toast.success("Reply sent");
                setActive(null);
              }}
            >
              Send reply
            </Button>
          </div>
        }
      >
        {active && (
          <div className="space-y-3">
            {active.messages.map((message) => (
              <MessageBubble
                key={message.id}
                participant={message.participant}
                content={message.content}
                sentAt={message.sentAt}
              />
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}

interface MessageBubbleProps {
  participant: ConversationParticipant;
  content: string;
  sentAt: string;
}

function MessageBubble({ participant, content, sentAt }: MessageBubbleProps) {
  const isCustomer = participant === "customer";
  const labels: Record<ConversationParticipant, string> = {
    customer: "Customer",
    ai: "AI assistant",
    agent: "Team agent",
  };
  const icons: Record<ConversationParticipant, React.ReactNode> = {
    customer: <User size={12} />,
    ai: <Bot size={12} />,
    agent: <UserCog size={12} />,
  };
  return (
    <div className={classNames("flex flex-col gap-1", isCustomer ? "items-start" : "items-end")}>
      <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
        {icons[participant]}
        {labels[participant]}
        <span className="font-medium normal-case tracking-normal text-[var(--color-ink-400)]">
          ·{" "}
          {new Date(sentAt).toLocaleTimeString("en-PK", {
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
            : participant === "ai"
              ? "bg-[var(--color-accent-700)] text-white"
              : "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]",
        )}
      >
        {content}
      </div>
    </div>
  );
}
