// Copy to a Next.js app's client-side lib/auth-client.ts.
import { createAuthClient } from "better-auth/react";
import { organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_ORIGIN!,
  fetchOptions: { credentials: "include" },
  plugins: [organizationClient(), apiKeyClient(), twoFactorClient()],
});

// signUp.email({ name, email, password })
// signIn.email({ email, password })
// requestPasswordReset({ email, redirectTo: `${location.origin}/reset-password` })
// resetPassword({ token: new URLSearchParams(location.search).get("token")!, newPassword })
// organization.create({ name, slug })
// GET /v1/organization-roles for the invitation picker.
// organization.inviteMember({ organizationId, email, role: "editor" })
// organization.acceptInvitation({ invitationId })
// organization.removeMember({ organizationId, memberIdOrEmail })
// createOrganizationApiKey({ organizationId, name, access: "read", expiration: 30 })
// createOrganizationApiKey({ organizationId, name, access: "read-write", expiration: "2026-12-31" })
// apiKey.list({ query: { organizationId } })
// apiKey.delete({ configId, keyId })
// On signIn.email success, if data.twoFactorRedirect is true, call
// twoFactor.sendOtp(), show a six-digit code input, then call
// twoFactor.verifyOtp({ code, trustDevice: true }). A new device or a device
// unused for 90 days will require a fresh code.
