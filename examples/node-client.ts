// Example for a server-side integration. Set API_ORIGIN, ORGANIZATION_ID, and
// API_KEY in the developer application's environment, never in browser code.
const apiOrigin = process.env.API_ORIGIN!;
const organizationId = process.env.ORGANIZATION_ID!;
const apiKey = process.env.API_KEY!;
const base = `${apiOrigin}/v1/organizations/${encodeURIComponent(organizationId)}/projects`;

const projects = await fetch(base, {
  headers: { "x-api-key": apiKey },
}).then((response) => response.json());

const created = await fetch(base, {
  method: "POST",
  headers: { "x-api-key": apiKey, "content-type": "application/json" },
  body: JSON.stringify({ name: "Partner project" }),
}).then((response) => response.json());

console.log({ projects, created });
