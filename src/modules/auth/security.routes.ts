import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { auth } from "./auth.js";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/prisma.js";

const paramsSchema = z.object({ organizationId: z.string().min(1) });
const updateSchema = z.object({ requireEmail2FA: z.boolean() }).strict();

async function getAdminOrganization(request: FastifyRequest, reply: FastifyReply, id: string) {
  if (request.headers["x-api-key"] !== undefined) {
    reply.code(401).send({ code: "UNAUTHORIZED" });
    return null;
  }
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) {
    reply.code(401).send({ code: "UNAUTHORIZED" });
    return null;
  }
  const membership = await prisma.member.findFirst({
    where: { organizationId: id, userId: session.user.id }, select: { role: true },
  });
  if (!membership?.role.split(",").some((role) => role.trim() === "owner" || role.trim() === "admin")) {
    reply.code(403).send({ code: "FORBIDDEN" });
    return null;
  }
  return membership;
}

export function registerSecurityRoutes(app: FastifyInstance): void {
  app.get("/v1/organizations/:organizationId/security", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ code: "BAD_REQUEST" });
    if (!await getAdminOrganization(request, reply, params.data.organizationId)) return;
    const policy = await prisma.organizationSecurityPolicy.findUnique({
      where: { organizationId: params.data.organizationId },
    });
    return { requireEmail2FA: policy?.requireEmail2FA ?? false, enforcedByEnvironment: env.REQUIRE_EMAIL_2FA };
  });

  app.put("/v1/organizations/:organizationId/security", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const input = updateSchema.safeParse(request.body);
    if (!params.success || !input.success) return reply.code(400).send({ code: "BAD_REQUEST" });
    if (!await getAdminOrganization(request, reply, params.data.organizationId)) return;
    const policy = await prisma.organizationSecurityPolicy.upsert({
      where: { organizationId: params.data.organizationId },
      create: { organizationId: params.data.organizationId, requireEmail2FA: input.data.requireEmail2FA },
      update: { requireEmail2FA: input.data.requireEmail2FA },
    });
    // Policy changes invalidate remembered devices for this tenant's members.
    const members = await prisma.member.findMany({
      where: { organizationId: params.data.organizationId }, select: { userId: true },
    });
    if (members.length) {
      await prisma.verification.deleteMany({
        where: { identifier: { startsWith: "trust-device-" }, value: { in: members.map((member) => member.userId) } },
      });
    }
    return { requireEmail2FA: policy.requireEmail2FA, enforcedByEnvironment: env.REQUIRE_EMAIL_2FA };
  });
}
