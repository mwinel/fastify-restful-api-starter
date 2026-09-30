import assert from "node:assert/strict";
import { test, mock } from "node:test";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.API_ORIGIN ??= "http://localhost:4000";
process.env.WEB_ORIGIN ??= "http://localhost:3000";
process.env.RESEND_API_KEY ??= "test-only";
process.env.MAIL_FROM ??= "test@example.com";

test("API keys enforce organization and action without falling back to cookies", async (t) => {
  const { auth } = await import("../src/modules/auth/auth.js");
  const { requireOrganizationAccess } = await import("../src/modules/auth/session.js");

  let verified: { valid: boolean; error: null | { code: string }; key: null | object } = {
    valid: true,
    error: null,
    key: { id: "key-1", configId: "org-read", referenceId: "org-a" },
  };
  const verifier = mock.method(auth.api, "verifyApiKey", async () => verified);
  const session = mock.method(auth.api, "getSession", async () => {
    throw new Error("An API key must not fall back to a browser session");
  });
  t.after(() => {
    verifier.mock.restore();
    session.mock.restore();
  });

  const request = { headers: { "x-api-key": "org_read_example", cookie: "session=browser" } };
  const response = () => ({
    statusCode: 200,
    code(status: number) { this.statusCode = status; return this; },
    send(_body: unknown) { return this; },
  });
  type Request = Parameters<typeof requireOrganizationAccess>[0];
  type Reply = Parameters<typeof requireOrganizationAccess>[1];
  const check = async (org: string, action: "read" | "create") => {
    const reply = response();
    const access = await requireOrganizationAccess(
      request as unknown as Request,
      reply as unknown as Reply,
      org,
      action,
    );
    return { access, status: reply.statusCode };
  };

  assert.deepEqual(await check("org-a", "read"), {
    access: { kind: "api-key", keyId: "key-1" }, status: 200,
  });
  assert.equal((await check("org-b", "read")).status, 403);

  verified = { valid: false, error: { code: "KEY_NOT_FOUND" }, key: null };
  assert.equal((await check("org-a", "create")).status, 401);

  verified = {
    valid: true,
    error: null,
    key: { id: "key-2", configId: "org-read-write", referenceId: "org-a" },
  };
  assert.deepEqual(await check("org-a", "create"), {
    access: { kind: "api-key", keyId: "key-2" }, status: 200,
  });
  assert.equal(session.mock.callCount(), 0);
});
