import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/prisma.js";

const app = await buildApp();
app.addHook("onClose", async () => { await prisma.$disconnect(); });
try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exitCode = 1;
}
