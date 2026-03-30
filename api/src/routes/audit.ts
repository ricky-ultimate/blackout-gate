import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";

export async function auditRoutes(app: FastifyInstance) {
  app.get(
    "/audit",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const query = request.query as {
        repo?: string;
        environment?: string;
        outcome?: string;
        limit?: string;
        offset?: string;
      };

      const conditions: string[] = ["org_id = $1"];
      const values: unknown[] = [request.org.id];
      let idx = 2;

      if (query.repo) {
        conditions.push(`repo = $${idx++}`);
        values.push(query.repo);
      }
      if (query.environment) {
        conditions.push(`environment = $${idx++}`);
        values.push(query.environment);
      }
      if (query.outcome) {
        conditions.push(`outcome = $${idx++}`);
        values.push(query.outcome);
      }

      const limit = Math.min(parseInt(query.limit ?? "50", 10), 200);
      const offset = parseInt(query.offset ?? "0", 10);

      const result = await db.query(
        `SELECT id, repo, environment, branch, triggered_by, window_id, window_name,
                outcome, reason, override_by, created_at
         FROM audit_log
         WHERE ${conditions.join(" AND ")}
         ORDER BY created_at DESC
         LIMIT $${idx++} OFFSET $${idx}`,
        [...values, limit, offset]
      );

      const countResult = await db.query(
        `SELECT COUNT(*) FROM audit_log WHERE ${conditions.join(" AND ")}`,
        values
      );

      return reply.send({
        total: parseInt(countResult.rows[0].count, 10),
        limit,
        offset,
        data: result.rows,
      });
    }
  );
}
