import type { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import { env } from "../../config/env.js";

export function registerAuthRoute(app: FastifyInstance): void {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      const url = new URL(request.url, env.API_ORIGIN);
      const response = await auth.handler(new Request(url, {
        method: request.method,
        headers: fromNodeHeaders(request.headers),
        ...(request.method !== "GET" && request.body !== undefined
          ? { body: JSON.stringify(request.body) }
          : {}),
      }));
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
}
