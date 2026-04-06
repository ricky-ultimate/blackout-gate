import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { generateToken, hashToken } from "../lib/token.js";

interface BootstrapBody {
  org_name: string;
  org_slug: string;
  api_key_label?: string;
}

export async function adminRoutes(app: FastifyInstance) {
  app.post<{ Body: BootstrapBody }>(
    "/admin/bootstrap",
    async (request, reply) => {
      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        return reply
          .status(500)
          .send({ error: "ADMIN_SECRET not configured." });
      }

      const authHeader = request.headers["authorization"];
      if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
        return reply.status(401).send({ error: "Unauthorized." });
      }

      const { org_name, org_slug, api_key_label = "default" } = request.body;

      if (!org_name || !org_slug) {
        return reply
          .status(400)
          .send({ error: "org_name and org_slug are required." });
      }

      const existing = await db.query(
        `SELECT id FROM organizations WHERE slug = $1`,
        [org_slug],
      );

      if (existing.rowCount !== null && existing.rowCount > 0) {
        return reply
          .status(409)
          .send({ error: `Org with slug '${org_slug}' already exists.` });
      }

      const orgResult = await db.query(
        `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id`,
        [org_name, org_slug],
      );

      const orgId = orgResult.rows[0].id;
      const token = generateToken();
      const hash = hashToken(token);

      await db.query(
        `INSERT INTO api_keys (org_id, key_hash, label) VALUES ($1, $2, $3)`,
        [orgId, hash, api_key_label],
      );

      return reply.status(201).send({
        org_id: orgId,
        org_slug,
        api_key: token,
        warning: "Store this API key securely. It will not be shown again.",
      });
    },
  );

  app.post("/admin/keys", async (request, reply) => {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
      return reply.status(500).send({ error: "ADMIN_SECRET not configured." });
    }

    const authHeader = request.headers["authorization"];
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
      return reply.status(401).send({ error: "Unauthorized." });
    }

    const { org_slug, label = "new key" } = request.body as {
      org_slug: string;
      label?: string;
    };

    if (!org_slug) {
      return reply.status(400).send({ error: "org_slug is required." });
    }

    const orgResult = await db.query(
      `SELECT id FROM organizations WHERE slug = $1`,
      [org_slug],
    );

    if (orgResult.rowCount === 0) {
      return reply.status(404).send({ error: "Org not found." });
    }

    const orgId = orgResult.rows[0].id;
    const token = generateToken();
    const hash = hashToken(token);

    await db.query(
      `INSERT INTO api_keys (org_id, key_hash, label) VALUES ($1, $2, $3)`,
      [orgId, hash, label],
    );

    return reply.status(201).send({
      api_key: token,
      warning: "Store this API key securely. It will not be shown again.",
    });
  });
}
