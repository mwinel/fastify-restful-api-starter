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
} as const);

export const roles = {
  owner: ac.newRole({
    ...ownerAc.statements,
    apiKey: ["create", "read", "update", "delete"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    apiKey: ["create", "read", "update", "delete"],
  }),
  member: ac.newRole({ ...memberAc.statements }),
};

export const apiKeyConfigIds = ["org-read", "org-read-write"] as const;
