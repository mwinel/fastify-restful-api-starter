import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { apiKeyConfigIds } from "./permissions.js";
import { prisma } from "../../infrastructure/prisma.js";

type Access = { kind: "session"; role: string } | { kind: "api-key"; keyId: string };
type Action = "read" | "write";

export async function requireOrganizationAccess(
  request: FastifyRequest,
  reply: FastifyReply,
  organizationId: string,
  action: Action,
): Promise<Access | null> {
  // A supplied key always wins. An invalid or mismatched key cannot fall back
  // to a browser session cookie carried on the same request.
  if (request.headers["x-api-key"] !== undefined) {
    const value = request.headers["x-api-key"];
    if (typeof value !== "string" || !value.trim()) {
      reply.code(401).send({ code: "INVALID_API_KEY", message: "Invalid API key" });
      return null;
    }
    const result = await auth.api.verifyApiKey({
      body: { key: value, permissions: { projects: [action] } },
    });
    if (!result.valid || !result.key) {
      if (result.error?.code === "RATE_LIMITED") {
        reply.code(429).send({ code: "RATE_LIMITED", message: "API key rate limit exceeded" });
        return null;
      }
      reply.code(401).send({ code: "INVALID_API_KEY", message: "Invalid API key or permission" });
      return null;
    }
    if (
      !apiKeyConfigIds.some((configId) => configId === result.key?.configId) ||
      result.key.referenceId !== organizationId
    ) {
      reply.code(403).send({ code: "FORBIDDEN", message: "Organization access denied" });
      return null;
    }
    return { kind: "api-key", keyId: result.key.id };
  }

  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) {
    reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in required" });
    return null;
  }
  const membership = await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId },
    select: { role: true },
  });
  if (!membership) {
    reply.code(403).send({ code: "FORBIDDEN", message: "Organization access denied" });
    return null;
  }
  if (
    action === "write" &&
    !membership.role.split(",").some((role) => role === "owner" || role === "admin")
  ) {
    reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient permissions" });
    return null;
  }
  return { kind: "session", role: membership.role };
}
