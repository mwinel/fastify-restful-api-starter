import { defineNitroConfig } from "nitro/config";

export default defineNitroConfig({
  modules: ["workflow/nitro"],
  preset: "node-server",
  traceDeps: ["@workflow/world-postgres*"],
  devServer: { port: Number(process.env.PORT ?? 4000) },
  plugins: ["./plugins/start-workflow-world.ts"],
  routes: {
    "/**": { handler: "./src/index.ts", format: "node" },
  },
});
