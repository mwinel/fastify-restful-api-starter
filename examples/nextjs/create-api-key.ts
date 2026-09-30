import { authClient } from "./auth-client";
import { keyExpiresInSeconds, type KeyExpiration } from "./api-key-expiration";

// Call from a client component after the owner/admin chooses a scope and date.
export async function createOrganizationApiKey(input: {
  organizationId: string;
  name: string;
  access: "read" | "read-write";
  expiration: KeyExpiration;
}) {
  return authClient.apiKey.create({
    organizationId: input.organizationId,
    name: input.name,
    configId: input.access === "read" ? "org-read" : "org-read-write",
    expiresIn: keyExpiresInSeconds(input.expiration),
  });
}
