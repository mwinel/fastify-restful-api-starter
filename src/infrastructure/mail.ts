import { env } from "../config/env.js";
import { createEmailSender } from "./email-sender.js";

const sendEmail = createEmailSender(env);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export async function sendLinkEmail(to: string, subject: string, url: string): Promise<void> {
  await sendEmail({ to, subject, html: `<p><a href="${escapeHtml(url)}">${escapeHtml(subject)}</a></p>`, text: `${subject}: ${url}` });
}

export async function sendCodeEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to, subject: "Your sign-in code",
    html: `<p>Your sign-in code is <strong>${escapeHtml(code)}</strong>.</p><p>It expires in 10 minutes.</p>`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes.`,
  });
}
