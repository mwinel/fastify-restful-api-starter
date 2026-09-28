// Copy to a Next.js app's client-side lib/auth-client.ts.
import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_ORIGIN!,
  fetchOptions: { credentials: "include" },
  plugins: [organizationClient()],
});

// signUp.email({ name, email, password })
// signIn.email({ email, password })
// requestPasswordReset({ email, redirectTo: `${location.origin}/reset-password` })
// resetPassword({ token: new URLSearchParams(location.search).get("token")!, newPassword })
// organization.create({ name, slug })
// organization.inviteMember({ organizationId, email, role: "member" })
// organization.acceptInvitation({ invitationId })
// organization.removeMember({ organizationId, memberIdOrEmail })
