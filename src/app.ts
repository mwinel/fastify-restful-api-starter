import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { registerAuthRoute } from "./modules/auth/auth.route.js";
import { registerProjectRoutes } from "./modules/projects/routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true, bodyLimit: 1024 * 1024 });
  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.get("/health", async () => ({ status: "ok" }));
  registerAuthRoute(app);
  registerProjectRoutes(app);
  return app;
}
