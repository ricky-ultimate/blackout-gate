import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { db } from "../db/client.js";
import { hashToken } from "../lib/token.js";

async function authPlugin(app: FastifyInstance) {
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const header = request.headers["authorization"];
      if (!header || !header.startsWith("Bearer ")) {
        return reply.status(401).send({ error: "Missing or invalid Authorization header." });
      }

      const token = header.slice(7);
      const hash = hashToken(token);

      const result = await db.query(
        `SELECT api_keys.id, api_keys.org_id, organizations.slug
         FROM api_keys
         JOIN organizations ON organizations.id = api_keys.org_id
         WHERE api_keys.key_hash = $1`,
        [hash]
      );

      if (result.rowCount === 0) {
        return reply.status(401).send({ error: "Invalid API key." });
      }

      await db.query(
        `UPDATE api_keys SET last_used_at = now() WHERE key_hash = $1`,
        [hash]
      );

      request.org = {
        id: result.rows[0].org_id,
        slug: result.rows[0].slug,
      };
    }
  );
}

export default fp(authPlugin);
