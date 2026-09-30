import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

export const ac = createAccessControl({
  ...defaultStatements,
  apiKey: ["create", "read", "update", "delete"],
  project: ["read", "create", "update", "delete"],
} as const);

export type ProjectAction = "read" | "create" | "update" | "delete";

// These are the roles an inviter can select. Keep their grants in one place.
export const functionalRoles = {
  viewer: { label: "Viewer", project: ["read"] },
  editor: { label: "Editor", project: ["read", "create", "update"] },
  manager: { label: "Manager", project: ["read", "create", "update", "delete"] },
} as const;

export const invitationRoleOptions = Object.entries(functionalRoles).map(([id, role]) => ({
  id,
  label: role.label,
  permissions: { project: role.project },
}));

export function isFunctionalRole(value: unknown): value is keyof typeof functionalRoles {
  return typeof value === "string" && Object.hasOwn(functionalRoles, value);
}

export const roles = {
  owner: ac.newRole({
    ...ownerAc.statements,
    apiKey: ["create", "read", "update", "delete"],
    project: ["read", "create", "update", "delete"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    apiKey: ["create", "read", "update", "delete"],
    project: ["read", "create", "update", "delete"],
  }),
  // Better Auth's default member role remains a read-only legacy role.
  member: ac.newRole({ ...memberAc.statements, project: ["read"] }),
  viewer: ac.newRole({ project: ["read"] }),
  editor: ac.newRole({ project: ["read", "create", "update"] }),
  manager: ac.newRole({ project: ["read", "create", "update", "delete"] }),
};

export function canPerformProjectAction(roleValue: string, action: ProjectAction): boolean {
  return roleValue.split(",").some((value) => {
    const role = value.trim();
    return Object.hasOwn(roles, role) &&
      roles[role as keyof typeof roles].authorize({ project: [action] }).success;
  });
}

export const apiKeyConfigIds = ["org-read", "org-read-write"] as const;
