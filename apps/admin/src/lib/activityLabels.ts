/** Human-readable labels for {@link AdminActivityEntry} `action` values. */
export const ACTIVITY_ACTION_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  archived: "Archived",
  restored: "Restored",
  status_changed: "Status changed",
  login: "Signed in",
  logout: "Signed out",
  invited: "Invited",
  signin_code_issued: "Sign-in code issued",
};

export function formatActivityAction(action: string): string {
  return ACTIVITY_ACTION_LABEL[action] ?? action.replace(/_/g, " ");
}
