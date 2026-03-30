import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import authPlugin from "./plugins/auth.js";
import { evaluateRoutes } from "./routes/evaluate.js";
import { overrideRoutes } from "./routes/override.js";
import { auditRoutes } from "./routes/audit.js";
import { adminRoutes } from "./routes/admin.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ["http://localhost:3001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

await app.register(authPlugin);
await app.register(evaluateRoutes, { prefix: "/v1" });
await app.register(overrideRoutes, { prefix: "/v1" });
await app.register(auditRoutes, { prefix: "/v1" });
await app.register(adminRoutes);

app.get("/health", async () => ({ status: "ok" }));

const port = parseInt(process.env.PORT ?? "3000", 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
