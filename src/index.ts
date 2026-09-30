import { buildApp } from "./app.js";
import { prisma } from "./infrastructure/prisma.js";
import type { IncomingMessage, ServerResponse } from "node:http";

const app = await buildApp();
app.addHook("onClose", async () => { await prisma.$disconnect(); });
await app.ready();

export default (request: IncomingMessage, response: ServerResponse) => {
  app.server.emit("request", request, response);
};
