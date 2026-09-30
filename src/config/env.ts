import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  API_ORIGIN: z.url(),
  WEB_ORIGIN: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  RESEND_API_KEY: z.string().min(1),
  MAIL_FROM: z.string().min(1),
  REQUIRE_EMAIL_2FA: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
});

export const env = schema.parse(process.env);
