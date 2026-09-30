import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/prisma.js";

// A user belonging to several tenants gets the strongest policy of any tenant.
export async function requiresEmail2FA(userId: string): Promise<boolean> {
  if (env.REQUIRE_EMAIL_2FA) return true;
  const membership = await prisma.member.findFirst({
    where: { userId, organization: { securityPolicy: { is: { requireEmail2FA: true } } } },
    select: { id: true },
  });
  return membership !== null;
}

export async function syncEmail2FA(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() }, select: { id: true, twoFactorEnabled: true },
  });
  if (!user) return;
  const required = await requiresEmail2FA(user.id);
  if (user.twoFactorEnabled !== required) {
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: required } });
  }
}
