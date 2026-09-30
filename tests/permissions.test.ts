import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canPerformProjectAction,
  functionalRoles,
  isFunctionalRole,
  type ProjectAction,
} from "../src/modules/auth/permissions.js";

test("functional roles grant discrete project actions", () => {
  const actions: ProjectAction[] = ["read", "create", "update", "delete"];
  for (const [role, definition] of Object.entries(functionalRoles)) {
    for (const action of actions) {
      assert.equal(
        canPerformProjectAction(role, action),
        (definition.project as readonly string[]).includes(action),
        `${role} ${action}`,
      );
    }
  }
  assert.equal(canPerformProjectAction("member", "read"), true);
  assert.equal(canPerformProjectAction("member", "create"), false);
  assert.equal(canPerformProjectAction("admin", "delete"), true);
  assert.equal(canPerformProjectAction("owner", "create"), true);
  assert.equal(canPerformProjectAction("unknown", "read"), false);
  assert.equal(canPerformProjectAction("viewer, editor", "create"), true);
});

test("only functional roles are selectable for invitations", () => {
  for (const role of Object.keys(functionalRoles)) assert.equal(isFunctionalRole(role), true);
  for (const role of ["owner", "admin", "member", "viewer,admin", "__proto__", undefined]) {
    assert.equal(isFunctionalRole(role), false);
  }
});
