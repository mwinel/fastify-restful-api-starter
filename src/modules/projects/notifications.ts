import { randomUUID } from "node:crypto";
import { start } from "workflow/api";
import { projectChangeWorkflow, type ProjectChange } from "../../workflows/project-change.js";

export async function notifyProjectChange(change: Omit<ProjectChange, "eventId">): Promise<void> {
  try {
    await start(projectChangeWorkflow, [{ ...change, eventId: randomUUID() }]);
  } catch (error) {
    // The mutation has committed. Failing its response would invite a duplicate write.
    console.error("Failed to enqueue project notification workflow", error);
  }
}
