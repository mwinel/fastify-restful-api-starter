// Client component fetches. Never read the HttpOnly cookie in JavaScript.
export async function getProjects(organizationId: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_ORIGIN}/v1/organizations/${encodeURIComponent(organizationId)}/projects`,
    { credentials: "include", cache: "no-store" },
  );
  if (response.status === 401) throw new Error("Sign in required");
  if (response.status === 403) throw new Error("Organization access denied");
  if (!response.ok) throw new Error("Could not load projects");
  return response.json();
}
