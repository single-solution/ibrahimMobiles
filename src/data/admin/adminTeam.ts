export type TeamRole = "Owner" | "Manager" | "Editor" | "Viewer";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  initials: string;
  joinedAt: string;
  lastActiveAt: string;
  isPending?: boolean;
}

export const teamMembers: TeamMember[] = [
  {
    id: "user-001",
    name: "Ibrahim Naseer",
    email: "ibrahim@ibrahimmobiles.pk",
    role: "Owner",
    initials: "IN",
    joinedAt: "2024-08-12T00:00:00.000Z",
    lastActiveAt: "2026-05-13T20:11:00.000Z",
  },
  {
    id: "user-002",
    name: "Hira Bashir",
    email: "hira@ibrahimmobiles.pk",
    role: "Manager",
    initials: "HB",
    joinedAt: "2025-03-04T00:00:00.000Z",
    lastActiveAt: "2026-05-13T18:44:00.000Z",
  },
  {
    id: "user-003",
    name: "Kashif Mehmood",
    email: "kashif@ibrahimmobiles.pk",
    role: "Editor",
    initials: "KM",
    joinedAt: "2025-09-21T00:00:00.000Z",
    lastActiveAt: "2026-05-13T17:02:00.000Z",
  },
  {
    id: "user-004",
    name: "Adeel Saqib",
    email: "adeel@ibrahimmobiles.pk",
    role: "Viewer",
    initials: "AS",
    joinedAt: "2026-05-11T00:00:00.000Z",
    lastActiveAt: "2026-05-12T13:30:00.000Z",
    isPending: true,
  },
];

export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  Owner: [
    "Full access",
    "Manage billing",
    "Add or remove team",
    "Edit settings",
  ],
  Manager: [
    "Edit products & variants",
    "Manage inquiries & dispatch",
    "Edit deals & content",
  ],
  Editor: [
    "Edit content blocks & FAQs",
    "Edit testimonials",
    "Cannot manage stock or pricing",
  ],
  Viewer: [
    "Read-only access to dashboard, inquiries and conversations",
  ],
};
