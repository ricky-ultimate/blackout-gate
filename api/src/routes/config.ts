import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import yaml from "js-yaml";

interface RecurrenceEntry {
  type: "range" | "cron";
  start?: string;
  end?: string;
  expressions?: string[];
  duration_minutes?: number;
}

interface WindowEntry {
  id: string;
  name: string;
  verdict: "block" | "warn";
  recurrence?: RecurrenceEntry;
}

interface RawWindow {
  id?: unknown;
  name?: unknown;
  verdict?: unknown;
  recurrence?: {
    type?: unknown;
    start?: unknown;
    end?: unknown;
    expressions?: unknown;
    duration_minutes?: unknown;
  };
}

interface RawConfig {
  windows?: RawWindow[];
}

function parseWindows(rawYaml: string): WindowEntry[] {
  const doc = yaml.load(rawYaml) as RawConfig;

  if (!doc || !Array.isArray(doc.windows)) {
    return [];
  }

  const results: WindowEntry[] = [];

  for (const w of doc.windows) {
    if (typeof w.id !== "string" || typeof w.name !== "string") {
      continue;
    }

    const verdict =
      w.verdict === "block" || w.verdict === "warn" ? w.verdict : null;

    if (!verdict) {
      continue;
    }

    const entry: WindowEntry = {
      id: w.id,
      name: w.name,
      verdict,
    };

    if (w.recurrence && typeof w.recurrence === "object") {
      const r = w.recurrence;
      const kind = r.type === "range" || r.type === "cron" ? r.type : undefined;

      if (kind) {
        const recurrence: RecurrenceEntry = { type: kind };

        if (typeof r.start === "string") recurrence.start = r.start;
        if (typeof r.end === "string") recurrence.end = r.end;
        if (typeof r.duration_minutes === "number")
          recurrence.duration_minutes = r.duration_minutes;
        if (
          Array.isArray(r.expressions) &&
          r.expressions.every((e: unknown) => typeof e === "string")
        ) {
          recurrence.expressions = r.expressions as string[];
        }

        entry.recurrence = recurrence;
      }
    }

    results.push(entry);
  }

  return results;
}

export async function configRoutes(app: FastifyInstance) {
  app.post(
    "/config/upload",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { yaml: rawYaml } = request.body as { yaml: string };

      if (!rawYaml || typeof rawYaml !== "string") {
        return reply.status(400).send({ error: "yaml field is required." });
      }

      let windows: WindowEntry[];
      try {
        windows = parseWindows(rawYaml);
      } catch {
        return reply.status(400).send({ error: "Invalid YAML." });
      }

      await db.query(
        `INSERT INTO org_configs (org_id, raw_yaml, parsed_windows)
         VALUES ($1, $2, $3)
         ON CONFLICT (org_id) DO UPDATE
         SET raw_yaml = EXCLUDED.raw_yaml,
             parsed_windows = EXCLUDED.parsed_windows,
             updated_at = now()`,
        [request.org.id, rawYaml, JSON.stringify(windows)],
      );

      return reply.status(200).send({ windows_parsed: windows.length });
    },
  );

  app.get(
    "/config/windows",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const result = await db.query(
        `SELECT parsed_windows, updated_at FROM org_configs WHERE org_id = $1`,
        [request.org.id],
      );

      if (result.rowCount === 0) {
        return reply.send({ windows: [], updated_at: null });
      }

      return reply.send({
        windows: result.rows[0].parsed_windows,
        updated_at: result.rows[0].updated_at,
      });
    },
  );
}
