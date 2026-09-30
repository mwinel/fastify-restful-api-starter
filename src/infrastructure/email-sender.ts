import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";

export type EmailMessage = { to: string; subject: string; html: string; text: string; idempotencyKey?: string };
type Config = typeof env;
type Dependencies = { fetch?: typeof fetch; transport?: Transporter };

export function createEmailSender(config: Config, dependencies: Dependencies = {}) {
  const request = dependencies.fetch ?? fetch;
  if (config.EMAIL_PROVIDER === "nodemailer") {
    const secure = config.SMTP_SECURE === undefined
      ? (config.SMTP_PORT ?? 587) === 465
      : config.SMTP_SECURE === "true";
    const transport = dependencies.transport ?? nodemailer.createTransport({
      host: config.SMTP_HOST!,
      port: config.SMTP_PORT ?? 587,
      secure,
      // STARTTLS is mandatory when credentials travel over port 587.
      requireTLS: !secure && Boolean(config.SMTP_USER),
      ...(config.SMTP_USER ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD! } } : {}),
    });
    return async (message: EmailMessage): Promise<void> => {
      const { idempotencyKey: _idempotencyKey, ...content } = message;
      const result = await transport.sendMail({ from: config.MAIL_FROM, ...content });
      if (result.rejected?.length) throw new Error("SMTP rejected email recipient");
    };
  }

  return async (message: EmailMessage): Promise<void> => {
    const postmark = config.EMAIL_PROVIDER === "postmark";
    const response = await request(postmark ? "https://api.postmarkapp.com/email" : "https://api.resend.com/emails", {
      method: "POST",
      headers: postmark
        ? { "X-Postmark-Server-Token": config.POSTMARK_SERVER_TOKEN!, "Content-Type": "application/json", Accept: "application/json" }
        : { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json", ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}) },
      body: JSON.stringify(postmark
        ? { From: config.MAIL_FROM, To: message.to, Subject: message.subject, HtmlBody: message.html, TextBody: message.text }
        : { from: config.MAIL_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
    });
    if (!response.ok) throw new Error(`${config.EMAIL_PROVIDER} email delivery failed: ${response.status}`);
    if (postmark) {
      const result = await response.json() as { ErrorCode?: number };
      if (result.ErrorCode !== 0) throw new Error("Postmark rejected email");
    }
  };
}
