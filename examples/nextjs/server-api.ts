// Server component usage: forward the incoming cookie to Fastify.
// Requires a shared cookie domain or a same-origin proxy so Next.js receives it.
import { headers } from "next/headers";

export async function serverApi(path: string) {
  const incoming = await headers();
  return fetch(`${process.env.API_ORIGIN}${path}`, {
    headers: { cookie: incoming.get("cookie") ?? "" },
    cache: "no-store",
  });
}
