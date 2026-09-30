import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  API_ORIGIN: z.url(),
  WEB_ORIGIN: z.url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  EMAIL_PROVIDER: z.enum(["resend", "postmark", "nodemailer"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  POSTMARK_SERVER_TOKEN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().min(1),
  REQUIRE_EMAIL_2FA: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
}).superRefine((value, context) => {
  const required = (name: "RESEND_API_KEY" | "POSTMARK_SERVER_TOKEN" | "SMTP_HOST") => {
    if (!value[name]?.trim()) context.addIssue({ code: "custom", path: [name], message: `Required for ${value.EMAIL_PROVIDER}` });
  };
  if (value.EMAIL_PROVIDER === "resend") required("RESEND_API_KEY");
  if (value.EMAIL_PROVIDER === "postmark") required("POSTMARK_SERVER_TOKEN");
  if (value.EMAIL_PROVIDER === "nodemailer") {
    required("SMTP_HOST");
    if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASSWORD)) {
      context.addIssue({ code: "custom", path: ["SMTP_PASSWORD"], message: "Set both SMTP_USER and SMTP_PASSWORD, or neither" });
    }
  }
});

export const parseEnv = (values: NodeJS.ProcessEnv) => schema.parse(values);
export const env = parseEnv(process.env);
