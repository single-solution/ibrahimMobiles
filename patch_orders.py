import re

with open('apps/admin/src/app/orders/_components/OrdersCatalog.tsx', 'r') as f:
    content = f.read()

# 1. Import OrderEditModal
if 'OrderEditModal' not in content:
    content = content.replace('import { ActivityDetailGrid }', 'import { OrderEditModal } from "./OrderEditModal";\nimport { ActivityDetailGrid }')

# 2. Rewrite OrderDetailPanel
old_panel = content[content.find('function OrderDetailPanel({'):content.find('function OrderStatusStepper({')]

new_panel = """function OrderDetailPanel({
  orderId,
  onBack,
  canUpdate,
  canDelete,
}: {
  orderId: string;
  onBack: () => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [status, setStatus] = useState("");
  const [dispatchVideoUrl, setDispatchVideoUrl] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const fetched = await apiFetch<AdminOrder>(`/api/orders/${orderId}`);
        if (cancelled) return;
        setOrder(fetched);
        setStatus(fetched.status);
        setDispatchVideoUrl(fetched.dispatchVideoUrl || "");
      } catch (error) {
        if (!cancelled) {
          toast.danger(error instanceof Error ? error.message : "Failed to load order");
          onBack();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId, onBack, toast]);

  async function handleStatusChange(newStatus: string) {
    if (!order) return;
    if (newStatus === "packed" && !dispatchVideoUrl.trim()) {
      setStatus("packed");
      toast.info("Please enter a dispatch video URL below to complete packing.");
      return;
    }
    
    setIsSavingStatus(true);
    const prevStatus = status;
    setStatus(newStatus);
    
    try {
      const updated = await apiFetch<AdminOrder>(`/api/orders/${order.id}`, {
        method: "PUT",
        json: { status: newStatus },
      });
      setOrder(updated);
      toast.success("Order status updated");
      scheduleStateUpdate();
      router.refresh();
    } catch (error) {
      setStatus(prevStatus);
      toast.danger(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleDispatchVideoSave(url: string) {
    setDispatchVideoUrl(url);
    if (!url.trim() || !order) return;

    setIsSavingStatus(true);
    try {
      const updated = await apiFetch<AdminOrder>(`/api/orders/${order.id}`, {
        method: "PUT",
        json: { 
          status: "packed",
          dispatchVideoUrl: url,
        },
      });
      setOrder(updated);
      setStatus("packed");
      toast.success("Dispatch video saved and order packed");
      scheduleStateUpdate();
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to save video");
    } finally {
      setIsSavingStatus(false);
    }
  }

  async function handleEditSave(payload: any) {
    if (!order) return;
    try {
      const updated = await apiFetch<AdminOrder>(`/api/orders/${order.id}`, {
        method: "PUT",
        json: { ...payload, status },
      });
      setOrder(updated);
      setIsEditing(false);
      toast.success("Order details updated");
      router.refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to update order");
      throw error;
    }
  }

  async function handleDelete() {
    if (!order) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/orders/${order.id}`, { method: "DELETE" });
      toast.success(`Order ${order.orderNumber} deleted`);
      router.refresh();
      onBack();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "Failed to delete order");
      setIsDeleting(false);
    }
  }

  if (!order) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink-500)]">
        Loading order…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col relative">
      {!canUpdate ? (
        <p className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2 text-center text-[11px] text-[var(--color-ink-600)]">
          Read-only — you can view orders but not change status.
        </p>
      ) : null}
      <WorkspaceDetailHeader
        onBack={onBack}
        backLabel="Back to orders"
        title={order.orderNumber}
        subtitle={`${new Date(order.placedAt).toLocaleString()} · ${order.payment} · ${order.delivery}`}
        badge={
          <StatusPill tone={STATUS_TONE[order.status] ?? "neutral"}>
            {STATUS_LABELS[order.status] ?? order.status}
          </StatusPill>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        <div className="space-y-5">
          <section className="grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
            <OrderStatusStepper status={status} onChange={handleStatusChange} disabled={!canUpdate || isSavingStatus} />

            {status === "packed" && (
              <VideoUpload
                value={dispatchVideoUrl}
                onChange={handleDispatchVideoSave}
                subjectKind="orders"
                subjectId={`dispatch-${order.id}`}
                label="Dispatch video"
                hint="Upload or paste a YouTube URL of the order being packed. Saving updates the order."
              />
            )}
          </section>

          <section className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 sm:grid-cols-2 relative">
            <div className="absolute top-4 right-4">
               {canUpdate ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit order
                </Button>
              ) : null}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Customer
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-900)]">
                {order.customer.name}
              </p>
              <p className="text-xs text-[var(--color-ink-600)]">
                {order.customer.city} · {order.customer.phoneNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                Loyalty
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-800)]">
                {order.pointsEarned > 0 ? `+${order.pointsEarned} earned` : "No points earned"}
                {order.pointsRedeemed > 0 ? ` · ${order.pointsRedeemed} redeemed` : ""}
              </p>
            </div>
          </section>

          {order.address ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] mb-3">
                Delivery address
              </p>
              <p className="text-sm font-medium text-[var(--color-ink-900)]">
                {order.address?.recipientName} · {order.address?.phoneNumber}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-ink-600)]">
                {[order.address?.street, order.address?.area, order.address?.city, order.address?.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </section>
          ) : null}

          <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Line items
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--color-ink-800)]">
                <thead>
                  <tr className="border-b border-[var(--color-ink-100)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                    <th className="pb-2 font-semibold">Product</th>
                    <th className="pb-2 text-right font-semibold">Qty</th>
                    <th className="pb-2 text-right font-semibold">Unit Price</th>
                    <th className="pb-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-ink-100)]">
                  {order.items.map((line) => (
                    <tr key={line.id}>
                      <td className="py-2 pr-2">
                        <div className="font-semibold text-[var(--color-ink-900)]">{line.productName}</div>
                        <div className="text-xs text-[var(--color-ink-500)]">{line.variantSummary}</div>
                      </td>
                      <td className="py-2 pl-2 text-right">{line.quantity}</td>
                      <td className="py-2 pl-2 text-right">{formatPrice(line.unitPriceRupees)}</td>
                      <td className="py-2 pl-2 text-right font-semibold">{formatPrice(line.unitPriceRupees * line.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 border-t border-[var(--color-ink-100)] pt-3 text-sm">
              <TotalRow label="Subtotal" value={formatPrice(order.totals.subtotalRupees)} />
              <TotalRow label="Shipping" value={formatPrice(order.totals.shippingRupees)} />
              {order.totals.discountRupees > 0 ? (
                <TotalRow
                  label="Discount"
                  value={`-${formatPrice(order.totals.discountRupees)}`}
                />
              ) : null}
              <TotalRow
                label="Total"
                value={formatPrice(Math.max(0, order.totals.subtotalRupees + order.totals.shippingRupees - order.totals.discountRupees))}
                strong
              />
            </div>
          </section>

          {order.timeline.length > 0 ? (
            <section className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)] mb-3">
                Timeline History
              </p>
              <ol className="space-y-3">
                {order.timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-[var(--color-ink-900)]">
                        {STATUS_LABELS[entry.status] ?? entry.status}
                      </span>
                      <span className="text-xs text-[var(--color-ink-500)]">
                        {new Date(entry.occurredAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.note ? (
                      <div className="mt-2 text-xs">
                        <ActivityDetailGrid detail={entry.note} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {canUpdate ? (
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<Printer size={12} />}
                onClick={() => window.open(`/orders/${order.id}/invoice`, '_blank')}
                title="Print professional invoice"
              >
                Print invoice
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Phone size={12} />}
              onClick={() => {
                window.location.href = `tel:${order.customer.phoneNumber.replace(/\s+/g, "")}`;
              }}
            >
              Call
            </Button>
            {order.customer.id ? (
              <ButtonLink
                variant="outline"
                size="sm"
                href={`/customers?customer=${order.customer.id}`}
              >
                Customer
              </ButtonLink>
            ) : null}
          </div>
          {canDelete ? (
            <Button
              variant="danger"
              size="sm"
              type="button"
              onClick={() => setConfirmDelete(true)}
              isLoading={isDeleting}
              leadingIcon={<Trash2 size={12} />}
            >
              Delete
            </Button>
          ) : null}
        </div>
      </footer>

      {isEditing && (
        <OrderEditModal 
          isOpen={isEditing} 
          onClose={() => setIsEditing(false)} 
          order={order}
          onSave={async (payload) => {
            await handleEditSave(payload);
          }}
          isSaving={false}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete order?"
        message={
          <>
            Delete <strong>{order.orderNumber}</strong>? Stock and loyalty adjustments will be
            reversed when applicable.
          </>
        }
        tone="danger"
        confirmLabel="Delete order"
        onConfirm={() => {
          setConfirmDelete(false);
          void handleDelete();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
"""

content = content.replace(old_panel, new_panel)

with open('apps/admin/src/app/orders/_components/OrdersCatalog.tsx', 'w') as f:
    f.write(content)
