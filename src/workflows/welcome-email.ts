import { sendWelcomeEmail } from "../infrastructure/mail.js";

export async function welcomeEmailWorkflow(userId: string, email: string, name: string): Promise<void> {
  "use workflow";
  await deliverWelcomeEmail(userId, email, name);
}

async function deliverWelcomeEmail(userId: string, email: string, name: string): Promise<void> {
  "use step";
  await sendWelcomeEmail(email, name, `welcome:${userId}`);
}
