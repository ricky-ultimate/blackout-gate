import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { generateToken, hashToken } from "../lib/token.js";

interface IssueOverrideBody {
  window_id: string;
  approved_by: string;
  expires_in_minutes?: number;
}

interface ValidateOverrideBody {
  token: string;
  window_id: string;
}

export async function overrideRoutes(app: FastifyInstance) {
  app.post<{ Body: IssueOverrideBody }>(
    "/overrides/issue",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { window_id, approved_by, expires_in_minutes = 60 } = request.body;

      if (!window_id || !approved_by) {
        return reply
          .status(400)
          .send({ error: "window_id and approved_by are required." });
      }

      const token = generateToken();
      const hash = hashToken(token);
      const expiresAt = new Date(Date.now() + expires_in_minutes * 60 * 1000);

      await db.query(
        `INSERT INTO override_tokens (org_id, token_hash, window_id, approved_by, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [request.org.id, hash, window_id, approved_by, expiresAt],
      );

      return reply.status(201).send({ token, expires_at: expiresAt });
    },
  );

  app.post<{ Body: ValidateOverrideBody }>(
    "/overrides/validate",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { token, window_id } = request.body;

      if (!token || !window_id) {
        return reply
          .status(400)
          .send({ error: "token and window_id are required." });
      }

      const hash = hashToken(token);

      const result = await db.query(
        `SELECT id, used, expires_at FROM override_tokens
         WHERE token_hash = $1
           AND org_id = $2
           AND window_id = $3`,
        [hash, request.org.id, window_id],
      );

      if (result.rowCount === 0) {
        return reply
          .status(404)
          .send({ valid: false, reason: "Token not found." });
      }

      const row = result.rows[0];

      if (row.used) {
        return reply
          .status(409)
          .send({ valid: false, reason: "Token already used." });
      }

      if (new Date(row.expires_at) < new Date()) {
        return reply
          .status(410)
          .send({ valid: false, reason: "Token expired." });
      }

      await db.query(`UPDATE override_tokens SET used = true WHERE id = $1`, [
        row.id,
      ]);

      return reply.send({ valid: true });
    },
  );
}
