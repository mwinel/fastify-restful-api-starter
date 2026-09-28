import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../infrastructure/prisma.js";
import { requireMembership, requireSession } from "../auth/session.js";

const paramsSchema = z.object({ organizationId: z.string().min(1) });
const bodySchema = z.object({ name: z.string().trim().min(1).max(200) });

// Example tenant-scoped REST resource. Apply the same guards to every domain module.
export function registerProjectRoutes(app: FastifyInstance): void {
  app.get("/v1/organizations/:organizationId/projects", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ code: "BAD_REQUEST" });
    const session = await requireSession(request, reply);
    if (!session || !await requireMembership(session.user.id, params.data.organizationId, reply)) return;
    return prisma.project.findMany({
      where: { organizationId: params.data.organizationId },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/v1/organizations/:organizationId/projects", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const body = bodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ code: "BAD_REQUEST" });
    const session = await requireSession(request, reply);
    if (!session) return;
    const membership = await requireMembership(session.user.id, params.data.organizationId, reply);
    if (!membership) return;
    if (!membership.role.split(",").some((role) => role === "owner" || role === "admin")) {
      return reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient permissions" });
    }
    const project = await prisma.project.create({
      data: { organizationId: params.data.organizationId, name: body.data.name },
    });
    return reply.code(201).send(project);
  });
}
