import type { FastifyInstance } from "fastify";
import { requireOrganizationAccess } from "../auth/session.js";
import { notifyProjectChange } from "./notifications.js";
import { organizationParamsSchema, projectBodySchema, projectParamsSchema } from "./schemas.js";
import { createProject, listProjects, updateProject } from "./service.js";

export function registerProjectRoutes(app: FastifyInstance): void {
  app.get("/v1/organizations/:organizationId/projects", async (request, reply) => {
    const params = organizationParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ code: "BAD_REQUEST" });
    if (!await requireOrganizationAccess(request, reply, params.data.organizationId, "read")) return;
    return listProjects(params.data.organizationId);
  });

  app.post("/v1/organizations/:organizationId/projects", async (request, reply) => {
    const params = organizationParamsSchema.safeParse(request.params);
    const body = projectBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ code: "BAD_REQUEST" });
    if (!await requireOrganizationAccess(request, reply, params.data.organizationId, "create")) return;
    const project = await createProject(params.data.organizationId, body.data.name);
    await notifyProjectChange({
      organizationId: project.organizationId, projectId: project.id, projectName: project.name, action: "created",
    });
    return reply.code(201).send(project);
  });

  app.patch("/v1/organizations/:organizationId/projects/:projectId", async (request, reply) => {
    const params = projectParamsSchema.safeParse(request.params);
    const body = projectBodySchema.safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ code: "BAD_REQUEST" });
    if (!await requireOrganizationAccess(request, reply, params.data.organizationId, "update")) return;
    const project = await updateProject(params.data.organizationId, params.data.projectId, body.data.name);
    if (!project) return reply.code(404).send({ code: "NOT_FOUND" });
    await notifyProjectChange({
      organizationId: project.organizationId, projectId: project.id, projectName: project.name, action: "updated",
    });
    return project;
  });
}
