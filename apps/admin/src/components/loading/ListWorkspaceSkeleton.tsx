import { WorkspaceFrame } from "@/components/workspace/adminWorkspaceUi";

export function ListWorkspaceSkeleton() {
  return (
    <WorkspaceFrame minHeight={false}>
      <div className="border-b border-[var(--color-ink-100)] px-4 py-3">
        <div className="h-9 w-48 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-ink-100)]/80" />
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-ink-100)]/70"
          />
        ))}
      </div>
    </WorkspaceFrame>
  );
}
