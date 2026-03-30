import { FastifyInstance } from "fastify";
import { db } from "../db/client";

interface EvaluateBody {
  repo: string;
  environment: string;
  branch: string;
  triggered_by: string;
  outcome: "allowed" | "blocked" | "warn";
  window_id?: string;
  window_name?: string;
  reason: string;
}

export async function evaluateRoutes(app: FastifyInstance) {
  app.post<{ Body: EvaluateBody }>(
    "/evaluate",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const {
        repo,
        environment,
        branch,
        triggered_by,
        outcome,
        window_id,
        window_name,
        reason,
      } = request.body;

      if (!repo || !environment || !outcome || !reason) {
        return reply.status(400).send({ error: "Missing required fields." });
      }

      await db.query(
        `INSERT INTO audit_log
          (org_id, repo, environment, branch, triggered_by, window_id, window_name, outcome, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          request.org.id,
          repo,
          environment,
          branch ?? null,
          triggered_by ?? null,
          window_id ?? null,
          window_name ?? null,
          outcome,
          reason,
        ]
      );

      return reply.status(201).send({ recorded: true });
    }
  );
}
