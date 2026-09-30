import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { apiKey } from "@better-auth/api-key";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/prisma.js";
import { sendLinkEmail } from "../../infrastructure/mail.js";
import { ac, roles } from "./permissions.js";

const organizationKeyOptions = {
  references: "organization" as const,
  requireName: true,
  rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 120 },
  keyExpiration: {
    defaultExpiresIn: 90 * 24 * 60 * 60 * 1000,
    disableCustomExpiresTime: true,
  },
};

export const auth = betterAuth({
  baseURL: env.API_ORIGIN,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [env.WEB_ORIGIN],
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/organization/invite-member": { window: 60, max: 20 },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendLinkEmail(user.email, "Reset your password", url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendLinkEmail(user.email, "Verify your email address", url);
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      disableOrganizationDeletion: true,
      requireEmailVerificationOnInvitation: true,
      sendInvitationEmail: async ({ id, email }) => {
        const url = new URL("/invitations/accept", env.WEB_ORIGIN);
        url.searchParams.set("invitationId", id);
        await sendLinkEmail(email, "Join your organization", url.toString());
      },
      organizationHooks: {
        beforeCreateInvitation: async ({ invitation }) => {
          // Granting owner is a separate transfer decision, never an invitation.
          if (invitation.role !== "member") {
            throw new APIError("FORBIDDEN", { message: "Only member invitations are enabled" });
          }
        },
        beforeRemoveMember: async ({ member }) => {
          if (member.role === "owner") {
            throw new APIError("FORBIDDEN", { message: "Owners cannot be removed" });
          }
        },
        beforeUpdateMemberRole: async () => {
          throw new APIError("FORBIDDEN", { message: "Role changes are not enabled" });
        },
      },
    }),
    apiKey([
      {
        ...organizationKeyOptions,
        configId: "org-read",
        defaultPrefix: "org_read_",
        permissions: { defaultPermissions: { projects: ["read"] } },
      },
      {
        ...organizationKeyOptions,
        configId: "org-read-write",
        defaultPrefix: "org_rw_",
        permissions: { defaultPermissions: { projects: ["read", "write"] } },
      },
    ]),
  ],
});
