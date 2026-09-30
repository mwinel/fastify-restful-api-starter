# Fastify REST API starter

Fastify + Better Auth organization and email/password authentication, Prisma 7/PostgreSQL, and a tenant-scoped REST resource example. Better Auth handles account and membership endpoints under `/api/auth/*`; domain endpoints use `/v1/organizations/:organizationId/*`.

## Setup

Requires Node.js 20+, PostgreSQL, and a Resend API key with a verified sender.

1. `npm ci`
2. Copy `.env.example` to `.env`. Set a strong `BETTER_AUTH_SECRET`, a working `DATABASE_URL`, `RESEND_API_KEY`, and a verified `MAIL_FROM`. `API_ORIGIN` and `WEB_ORIGIN` are exact public origins, without a path.
3. `npm run db:generate`
4. `npm run db:deploy` to apply the committed initial migration to your database.
5. `npm run dev`. The API listens on port 4000 by default.

The initial migration was generated from the Prisma schema without connecting to a database. It must be applied to a real PostgreSQL database before signup can work. Do not use the placeholder values from `.env.example` in production.

For schema changes: edit `prisma/schema.prisma`, run `npm run db:migrate -- --name <change>`, then `npm run db:generate`. If Better Auth settings/plugins change its models, first run `npm run auth:generate`, review the resulting schema diff to preserve domain models and relations, then create a Prisma migration. `auth generate` writes schema only; it does not migrate PostgreSQL. On a completely fresh setup, generate the initial Prisma Client before `auth:generate` because `auth.ts` imports the client.

## API

| Operation | Route |
| --- | --- |
| Sign up | `POST /api/auth/sign-up/email` |
| Sign in | `POST /api/auth/sign-in/email` |
| Request password reset | `POST /api/auth/request-password-reset` |
| Reset password | `POST /api/auth/reset-password` |
| Session | `GET /api/auth/get-session` |
| Create organization | `POST /api/auth/organization/create` |
| List organizations | `GET /api/auth/organization/list` |
| Invite member | `POST /api/auth/organization/invite-member` |
| Accept invitation | `POST /api/auth/organization/accept-invitation` |
| Remove member | `POST /api/auth/organization/remove-member` |
| Invitation role options | `GET /v1/organization-roles` |
| List projects | `GET /v1/organizations/:organizationId/projects` |
| Create project | `POST /v1/organizations/:organizationId/projects` |
| Create API key | `POST /api/auth/api-key/create` |
| List API keys | `GET /api/auth/api-key/list?organizationId=...` |
| Revoke API key | `POST /api/auth/api-key/delete` |
| Read organization 2FA setting | `GET /v1/organizations/:organizationId/security` |
| Update organization 2FA setting | `PUT /v1/organizations/:organizationId/security` |

Email verification is required before sign-in. Invitees receive one of the predefined functional roles below. Fetch `GET /v1/organization-roles` to populate a role picker, then pass the selected `id` as `role` to Better Auth's `organization.inviteMember({ organizationId, email, role })`. The server rejects owner, admin, legacy member, unknown, and combined roles during invitation. Better Auth's default owner/admin permissions control sending invitations and removing members. Owner removal and role changes are disabled; organization deletion is disabled. These policies are enforced by Better Auth organization hooks, not the UI.

| Invitation role | `project:read` | `project:create` | `project:update` | `project:delete` |
| --- | :---: | :---: | :---: | :---: |
| Viewer | Yes | | | |
| Editor | Yes | Yes | Yes | |
| Manager | Yes | Yes | Yes | Yes |

Owner and admin have all four project permissions plus their organization management permissions. Existing Better Auth `member` records retain read access. The project example currently implements list (`project:read`) and create (`project:create`); use the corresponding action in `requireOrganizationAccess` when adding update and delete routes. The guard queries membership for every session request, so removed members lose access immediately and no active organization cookie decides the tenant. Unknown roles fail closed. API keys use independent organization scopes and the same project action names.

Better Auth rate limits sign-up, sign-in, reset requests, and invitations. Limits use the shared PostgreSQL `rateLimit` table so they work across API instances. Put the API behind a trusted proxy and forward the actual client IP; do not accept arbitrary client-supplied forwarding headers.

## Email two-factor authentication

Set `REQUIRE_EMAIL_2FA=true` on the API to require email 2FA globally (default: `false`). An organization owner or admin can also set `PUT /v1/organizations/:organizationId/security` with `{ "requireEmail2FA": true }` using their signed-in session. `GET` returns the saved value and `enforcedByEnvironment`; the environment flag takes precedence. Only owner/admin browser sessions can read or change this setting; API keys cannot. For users in several organizations, any organization requiring 2FA makes it mandatory for that account. Changes take effect on the next password sign-in; existing sessions continue until their normal expiry. Updating an organization setting invalidates remembered devices for its current members.

On email/password sign-in, Better Auth checks the policy and returns `twoFactorRedirect: true` when a code is required. No authenticated session is issued until verification succeeds. The Next.js client calls `twoFactor.sendOtp()`, then `twoFactor.verifyOtp({ code, trustDevice: true })`; see `examples/nextjs/email-2fa.ts`. The six-digit email code expires in 10 minutes. A successfully verified device is trusted for 90 days, refreshed on successful sign-ins; a new device or one unused for 90 days receives a new challenge. Codes are encrypted at rest in Better Auth's verification store. The server manages the 2FA enrollment flag from the effective policy, so the ordinary enable/disable endpoints are blocked. This applies to credential sign-in; adding OAuth or passwordless login later requires its own 2FA gate. Email is the second factor here, so access to a compromised mailbox can defeat it; an authenticator app or passkey is stronger for sensitive accounts.

Apply the `20260930073000_email_2fa` migration before deploying the new API version. It adds Better Auth's two-factor schema and the organization security setting. Configure the email provider before enabling the policy.

## Organization API keys

Organization owners and admins can create, list, and revoke keys using their signed-in browser session. Members cannot manage keys. Use Better Auth's `apiKeyClient()` in Next.js alongside `organizationClient()`. Creating a key requires `organizationId`, `name`, and one of these configurations:

| `configId` | Data access |
| --- | --- |
| `org-read` | `GET /v1/organizations/:organizationId/projects` |
| `org-read-write` | GET and `POST /v1/organizations/:organizationId/projects` |

The read preset grants `project:read`; the read-write preset grants `project:read` and `project:create`. A key cannot call future update/delete routes without those actions explicitly granted.

Use `examples/nextjs/create-api-key.ts` to create a key with a 30, 60, or 90 day duration, or a custom date between 1 and 365 days away. For example, `createOrganizationApiKey({ organizationId, name: "Partner app", access: "read-write", expiration: 60 })`. A date-only string such as `"2026-12-31"` expires at the end of that day in the browser's local timezone. Better Auth receives `expiresIn` in **seconds** and enforces the 1–365 day range on the server; if a caller omits it, the default is 90 days. Creation returns an opaque `key` value. **Show and copy this secret once**; subsequent list/get calls return only metadata, not the secret. The key itself is the credential: there is no separate client ID and secret pair. Keys are hashed in the database and limited to 120 verifications per minute. Use `authClient.apiKey.list({ query: { organizationId } })` to view metadata and `authClient.apiKey.delete({ configId, keyId })` to revoke immediately. Create a replacement before the old key expires.

Server-side integrations send `X-API-Key: <secret>` to the organization's REST URL. See `examples/node-client.ts`. A key can access only its own organization and permitted actions; it cannot create more keys or act as a user session. A supplied invalid key will never fall back to a browser cookie. Keep the secret out of client-side code, URLs, logs, and version control.

## Next.js client

See `examples/nextjs/` for the Better Auth browser client, a credentialed domain API request, and server-side cookie forwarding. In the Next.js project, install a compatible `better-auth` version, set `NEXT_PUBLIC_API_ORIGIN` to the Fastify origin, and call `authClient.signUp.email`, `authClient.signIn.email`, and `authClient.organization.*`. The reset page reads the `token` query parameter and calls `authClient.resetPassword`; the invitation page reads `invitationId` and accepts after the invited person signs in.

Browser requests use `credentials: "include"`. The session cookie is HttpOnly. For server components, Next.js must receive the cookie and forward it to Fastify. A same-origin reverse proxy for both auth and domain API routes is the simplest production setup. Alternatively, configure a shared parent cookie domain for `app.example.com` and `api.example.com`. Separate top-level domains can lose third-party cookies in Safari. CORS is restricted to `WEB_ORIGIN` and Better Auth also checks trusted origins.

## Checks

`npm run typecheck` and `npm run build` validate TypeScript. The committed migration is generated with Prisma's schema diff; integration tests against an actual PostgreSQL instance and a real mail provider remain necessary before production deployment.
