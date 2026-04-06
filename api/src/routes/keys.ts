import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";

export async function keyRoutes(app: FastifyInstance) {
  app.get(
    "/keys",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await db.query(
        `SELECT id, label, created_at, last_used_at
         FROM api_keys
         WHERE org_id = $1
         ORDER BY created_at DESC`,
        [request.org.id],
      );

      return reply.send({ keys: result.rows });
    },
  );

  app.delete(
    "/keys/:key_id",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { key_id } = request.params as { key_id: string };

      const result = await db.query(
        `DELETE FROM api_keys WHERE id = $1 AND org_id = $2 RETURNING id`,
        [key_id, request.org.id],
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: "Key not found." });
      }

      return reply.status(200).send({ revoked: true });
    },
  );
}
