import { z } from "zod";

export const organizationParamsSchema = z.object({ organizationId: z.string().min(1) });
export const projectParamsSchema = organizationParamsSchema.extend({ projectId: z.string().min(1) });
export const projectBodySchema = z.object({ name: z.string().trim().min(1).max(200) }).strict();
