import { definePlugin } from "nitro";

export default definePlugin(async () => {
  if (process.env.WORKFLOW_TARGET_WORLD === "@workflow/world-postgres") {
    const { getWorld } = await import("workflow/runtime");
    await getWorld().start?.();
  }
});
