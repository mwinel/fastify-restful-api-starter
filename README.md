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
| List projects | `GET /v1/organizations/:organizationId/projects` |
| Create project | `POST /v1/organizations/:organizationId/projects` |

Email verification is required before sign-in. Invitations only grant `member`. Better Auth's default owner/admin permissions control sending invitations and removing members. Owner removal and role changes are disabled; organization deletion is disabled. These policies are enforced by Better Auth organization hooks, not the UI. The project routes query membership on every request, so access to a removed organization stops immediately despite a still-valid account session. The project example allows all members to list and only owner/admin to create.

Better Auth rate limits sign-up, sign-in, reset requests, and invitations. Limits use the shared PostgreSQL `rateLimit` table so they work across API instances. Put the API behind a trusted proxy and forward the actual client IP; do not accept arbitrary client-supplied forwarding headers.

## Next.js client

See `examples/nextjs/` for the Better Auth browser client, a credentialed domain API request, and server-side cookie forwarding. In the Next.js project, install a compatible `better-auth` version, set `NEXT_PUBLIC_API_ORIGIN` to the Fastify origin, and call `authClient.signUp.email`, `authClient.signIn.email`, and `authClient.organization.*`. The reset page reads the `token` query parameter and calls `authClient.resetPassword`; the invitation page reads `invitationId` and accepts after the invited person signs in.

Browser requests use `credentials: "include"`. The session cookie is HttpOnly. For server components, Next.js must receive the cookie and forward it to Fastify. A same-origin reverse proxy for both auth and domain API routes is the simplest production setup. Alternatively, configure a shared parent cookie domain for `app.example.com` and `api.example.com`. Separate top-level domains can lose third-party cookies in Safari. CORS is restricted to `WEB_ORIGIN` and Better Auth also checks trusted origins.

## Checks

`npm run typecheck` and `npm run build` validate TypeScript. The committed migration is generated with Prisma's schema diff; integration tests against an actual PostgreSQL instance and a real mail provider remain necessary before production deployment.
