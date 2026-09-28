import { env } from "../config/env.js";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export async function sendLinkEmail(to: string, subject: string, url: string): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [to],
      subject,
      html: `<p><a href="${escapeHtml(url)}">${escapeHtml(subject)}</a></p>`,
    }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
}
