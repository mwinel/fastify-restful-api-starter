import assert from "node:assert/strict";
import { test } from "node:test";
import type { Transporter } from "nodemailer";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-at-least-thirty-two-characters";
process.env.API_ORIGIN ??= "http://localhost:4000";
process.env.WEB_ORIGIN ??= "http://localhost:3000";
process.env.MAIL_FROM ??= "Example <test@example.com>";
process.env.RESEND_API_KEY ??= "test-only";

const { parseEnv } = await import("../src/config/env.js");
const { createEmailSender } = await import("../src/infrastructure/email-sender.js");
const message = { to: "person@example.com", subject: "Verify", html: "<p>Click</p>", text: "Click" };

test("provider config requires only the selected provider's credentials", () => {
  const base = { ...process.env, RESEND_API_KEY: "", POSTMARK_SERVER_TOKEN: "", SMTP_HOST: "" };
  assert.throws(() => parseEnv(base));
  assert.equal(parseEnv({ ...base, RESEND_API_KEY: "resend-token" }).EMAIL_PROVIDER, "resend");
  assert.equal(parseEnv({ ...base, EMAIL_PROVIDER: "postmark", POSTMARK_SERVER_TOKEN: "server-token" }).EMAIL_PROVIDER, "postmark");
  assert.equal(parseEnv({ ...base, EMAIL_PROVIDER: "nodemailer", SMTP_HOST: "smtp.example.com" }).EMAIL_PROVIDER, "nodemailer");
  assert.throws(() => parseEnv({ ...base, EMAIL_PROVIDER: "nodemailer", SMTP_HOST: "smtp.example.com", SMTP_USER: "name" }));
});

test("Resend and Postmark receive equivalent content with their own API formats", async () => {
  for (const provider of ["resend", "postmark"] as const) {
    let url = "";
    let request: RequestInit | undefined;
    const fetchStub = async (input: string | URL | Request, init?: RequestInit) => {
      url = String(input);
      request = init;
      return new Response(provider === "postmark" ? JSON.stringify({ ErrorCode: 0 }) : "{}", { status: 200 });
    };
    const config = parseEnv({
      ...process.env, EMAIL_PROVIDER: provider, RESEND_API_KEY: "resend-token", POSTMARK_SERVER_TOKEN: "server-token",
    });
    await createEmailSender(config, { fetch: fetchStub as typeof fetch })(message);
    const body = JSON.parse(String(request?.body));
    if (provider === "resend") {
      assert.equal(url, "https://api.resend.com/emails");
      assert.equal((request?.headers as Record<string, string>).Authorization, "Bearer resend-token");
      assert.deepEqual(body.to, [message.to]);
      assert.equal(body.html, message.html);
    } else {
      assert.equal(url, "https://api.postmarkapp.com/email");
      assert.equal((request?.headers as Record<string, string>)["X-Postmark-Server-Token"], "server-token");
      assert.equal(body.To, message.to);
      assert.equal(body.HtmlBody, message.html);
    }
  }
});

test("provider failures reject rather than report delivery success", async () => {
  const config = parseEnv({ ...process.env, EMAIL_PROVIDER: "postmark", POSTMARK_SERVER_TOKEN: "token" });
  const send = createEmailSender(config, {
    fetch: async () => new Response(JSON.stringify({ ErrorCode: 422 }), { status: 200 }),
  });
  await assert.rejects(send(message), /Postmark rejected/);
});

test("Nodemailer delegates the same message to its SMTP transport", async () => {
  const config = parseEnv({ ...process.env, EMAIL_PROVIDER: "nodemailer", SMTP_HOST: "smtp.example.com" });
  let delivered: Record<string, unknown> | undefined;
  const transport = {
    async sendMail(options: Record<string, unknown>) {
      delivered = options;
      return { accepted: [message.to], rejected: [] };
    },
  } as unknown as Transporter;
  await createEmailSender(config, { transport })(message);
  assert.equal(delivered?.to, message.to);
  assert.equal(delivered?.from, config.MAIL_FROM);
  assert.equal(delivered?.text, message.text);
  const rejectingTransport = {
    async sendMail() { return { accepted: [], rejected: [message.to] }; },
  } as unknown as Transporter;
  await assert.rejects(createEmailSender(config, { transport: rejectingTransport })(message), /SMTP rejected/);
});
