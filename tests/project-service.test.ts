import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.API_ORIGIN ??= "http://localhost:4000";
process.env.WEB_ORIGIN ??= "http://localhost:3000";
process.env.RESEND_API_KEY ??= "test-only";
process.env.MAIL_FROM ??= "test@example.com";

const { updateProject } = await import("../src/modules/projects/service.js");
const { projectBodySchema } = await import("../src/modules/projects/schemas.js");

test("project updates require the matching organization for write and read", async () => {
  const queries: unknown[] = [];
  const repository = {
    async updateMany(query: unknown) { queries.push(query); return { count: 1 }; },
    async findFirst(query: unknown) { queries.push(query); return { id: "project-a", organizationId: "org-a", name: "Renamed" }; },
  };
  type Repository = Parameters<typeof updateProject>[3];
  const project = await updateProject("org-a", "project-a", "Renamed", repository as Repository);
  assert.equal(project?.name, "Renamed");
  assert.deepEqual(queries, [
    { where: { id: "project-a", organizationId: "org-a" }, data: { name: "Renamed" } },
    { where: { id: "project-a", organizationId: "org-a" } },
  ]);
});

test("a project outside the organization is not returned", async () => {
  let readAttempted = false;
  const repository = {
    async updateMany() { return { count: 0 }; },
    async findFirst() { readAttempted = true; throw new Error("Must not read another tenant"); },
  };
  type Repository = Parameters<typeof updateProject>[3];
  assert.equal(await updateProject("org-b", "project-a", "Renamed", repository as Repository), null);
  assert.equal(readAttempted, false);
});

test("project input accepts a trimmed name only", () => {
  assert.deepEqual(projectBodySchema.parse({ name: "  Example  " }), { name: "Example" });
  assert.equal(projectBodySchema.safeParse({ name: " ", organizationId: "org-b" }).success, false);
  assert.equal(projectBodySchema.safeParse({ name: "Example", organizationId: "org-b" }).success, false);
});
