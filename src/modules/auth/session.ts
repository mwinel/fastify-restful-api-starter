import type { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { prisma } from "../../infrastructure/prisma.js";

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) {
    reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in required" });
    return null;
  }
  return session;
}

export async function requireMembership(
  userId: string,
  organizationId: string,
  reply: FastifyReply,
) {
  const membership = await prisma.member.findFirst({
    where: { userId, organizationId },
    select: { id: true, role: true },
  });
  if (!membership) {
    reply.code(403).send({ code: "FORBIDDEN", message: "Organization access denied" });
    return null;
  }
  return membership;
}
