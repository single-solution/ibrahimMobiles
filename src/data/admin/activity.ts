export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "archived"
  | "duplicated"
  | "restocked"
  | "discounted"
  | "logged-in";

export interface ActivityEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: ActivityAction;
  resourceLabel: string;
  resourceType: string;
  detail?: string;
  occurredAt: string;
}

export const activityFeed: ActivityEntry[] = [
  {
    id: "act-001",
    actorName: "Ibrahim Naseer",
    actorRole: "Owner",
    action: "updated",
    resourceLabel: "iPhone 15 Pro · Genuine A+ 256 GB",
    resourceType: "Variant",
    detail: "Price changed from Rs 359,000 to Rs 349,000.",
    occurredAt: "2026-05-13T20:11:00.000Z",
  },
  {
    id: "act-002",
    actorName: "Hira Bashir",
    actorRole: "Manager",
    action: "created",
    resourceLabel: "Galaxy S23 · Box-open A 256 GB Cream",
    resourceType: "Variant",
    occurredAt: "2026-05-13T18:44:00.000Z",
  },
  {
    id: "act-003",
    actorName: "Kashif Mehmood",
    actorRole: "Editor",
    action: "updated",
    resourceLabel: "Home hero copy",
    resourceType: "Content block",
    detail: "Updated subheading to mention 15-day moneyback.",
    occurredAt: "2026-05-13T17:02:00.000Z",
  },
  {
    id: "act-004",
    actorName: "Ibrahim Naseer",
    actorRole: "Owner",
    action: "discounted",
    resourceLabel: "Bank transfer 5% off",
    resourceType: "Offer",
    detail: "Extended expiry by 20 days.",
    occurredAt: "2026-05-13T14:18:00.000Z",
  },
  {
    id: "act-005",
    actorName: "Hira Bashir",
    actorRole: "Manager",
    action: "restocked",
    resourceLabel: "iPhone 13 · Genuine A 128 GB",
    resourceType: "Variant",
    detail: "Restocked 4 units.",
    occurredAt: "2026-05-13T12:55:00.000Z",
  },
  {
    id: "act-006",
    actorName: "Ibrahim Naseer",
    actorRole: "Owner",
    action: "archived",
    resourceLabel: "iPhone XR",
    resourceType: "Product",
    detail: "Archived — last unit sold.",
    occurredAt: "2026-05-12T19:32:00.000Z",
  },
  {
    id: "act-007",
    actorName: "Kashif Mehmood",
    actorRole: "Editor",
    action: "updated",
    resourceLabel: "Testimonial · Ayesha Malik",
    resourceType: "Testimonial",
    occurredAt: "2026-05-12T16:11:00.000Z",
  },
  {
    id: "act-008",
    actorName: "Hira Bashir",
    actorRole: "Manager",
    action: "updated",
    resourceLabel: "Inquiry INQ-008",
    resourceType: "Inquiry",
    detail: "Status changed from delivered to moneyback.",
    occurredAt: "2026-05-12T11:24:00.000Z",
  },
  {
    id: "act-009",
    actorName: "Ibrahim Naseer",
    actorRole: "Owner",
    action: "logged-in",
    resourceLabel: "Admin console",
    resourceType: "Session",
    occurredAt: "2026-05-12T09:00:00.000Z",
  },
  {
    id: "act-010",
    actorName: "Hira Bashir",
    actorRole: "Manager",
    action: "duplicated",
    resourceLabel: "iPhone 14 → iPhone 14 (China pack)",
    resourceType: "Variant",
    occurredAt: "2026-05-11T18:42:00.000Z",
  },
  {
    id: "act-011",
    actorName: "Kashif Mehmood",
    actorRole: "Editor",
    action: "created",
    resourceLabel: "FAQ · Bank transfer instructions",
    resourceType: "Content block",
    occurredAt: "2026-05-11T15:08:00.000Z",
  },
  {
    id: "act-012",
    actorName: "Ibrahim Naseer",
    actorRole: "Owner",
    action: "updated",
    resourceLabel: "Service cities",
    resourceType: "Settings",
    detail: "Added Sialkot to delivery list.",
    occurredAt: "2026-05-11T11:10:00.000Z",
  },
  {
    id: "act-013",
    actorName: "Hira Bashir",
    actorRole: "Manager",
    action: "deleted",
    resourceLabel: "Galaxy A14 · LCD shaded C 64 GB",
    resourceType: "Variant",
    detail: "Out of stock — removed listing.",
    occurredAt: "2026-05-10T16:30:00.000Z",
  },
  {
    id: "act-014",
    actorName: "Kashif Mehmood",
    actorRole: "Editor",
    action: "updated",
    resourceLabel: "About page — buying process",
    resourceType: "Content block",
    occurredAt: "2026-05-10T14:18:00.000Z",
  },
  {
    id: "act-015",
    actorName: "Ibrahim Naseer",
    actorRole: "Owner",
    action: "created",
    resourceLabel: "Hira Bashir",
    resourceType: "Team member",
    detail: "Invited as Manager.",
    occurredAt: "2026-05-09T09:50:00.000Z",
  },
];

export function getActivityActionLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    created: "created",
    updated: "updated",
    deleted: "deleted",
    archived: "archived",
    duplicated: "duplicated",
    restocked: "restocked",
    discounted: "discounted",
    "logged-in": "logged in",
  };
  return labels[action];
}
