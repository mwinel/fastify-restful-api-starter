import { prisma } from "../../infrastructure/prisma.js";

export function listProjects(organizationId: string) {
  return prisma.project.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export function createProject(organizationId: string, name: string) {
  return prisma.project.create({ data: { organizationId, name } });
}

export async function updateProject(
  organizationId: string,
  projectId: string,
  name: string,
  repository: Pick<typeof prisma.project, "updateMany" | "findFirst"> = prisma.project,
) {
  const result = await repository.updateMany({
    where: { id: projectId, organizationId }, data: { name },
  });
  if (!result.count) return null;
  return repository.findFirst({ where: { id: projectId, organizationId } });
}
