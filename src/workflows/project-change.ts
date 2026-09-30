import { prisma } from "../infrastructure/prisma.js";
import { sendProjectChangeEmail } from "../infrastructure/mail.js";

export type ProjectChange = {
  eventId: string;
  organizationId: string;
  projectId: string;
  projectName: string;
  action: "created" | "updated";
};

export async function projectChangeWorkflow(change: ProjectChange): Promise<void> {
  "use workflow";
  const organization = await getOrganizationRecipients(change.organizationId);
  if (!organization) return;
  // Bound concurrent sends for organizations with many members.
  for (let index = 0; index < organization.members.length; index += 10) {
    await Promise.all(organization.members.slice(index, index + 10).map((member) =>
      deliverProjectChange(member.user.id, member.user.email, organization.name, change),
    ));
  }
}

async function getOrganizationRecipients(organizationId: string) {
  "use step";
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      members: { select: { user: { select: { id: true, email: true } } } },
    },
  });
}

async function deliverProjectChange(userId: string, email: string, organizationName: string, change: ProjectChange) {
  "use step";
  await sendProjectChangeEmail({
    to: email, organizationName, projectName: change.projectName, action: change.action,
    idempotencyKey: `project:${change.eventId}:${userId}`,
  });
}
