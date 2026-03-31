import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";

interface WindowEntry {
  id: string;
  name: string;
  verdict: "block" | "warn";
  recurrence?: {
    type: "range" | "cron";
    start?: string;
    end?: string;
    expressions?: string[];
    duration_minutes?: number;
  };
}

interface BlackoutYamlWindow {
  id: string;
  name: string;
  verdict: string;
  recurrence?: {
    type: string;
    start?: string;
    end?: string;
    expressions?: string[];
    duration_minutes?: number;
  };
}

interface BlackoutYaml {
  windows?: BlackoutYamlWindow[];
}

function parseWindows(yaml: string): WindowEntry[] {
  try {
    const lines = yaml.split("\n");
    const windows: WindowEntry[] = [];
    let current: Partial<WindowEntry> & {
      recurrence?: WindowEntry["recurrence"];
    } = {};
    let inRecurrence = false;
    let inWindow = false;

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (line.match(/^  - id:/)) {
        if (inWindow && current.id) {
          windows.push(current as WindowEntry);
        }
        current = { id: line.replace(/^  - id:\s*/, "").replace(/"/g, "") };
        inWindow = true;
        inRecurrence = false;
      } else if (inWindow && line.match(/^    name:/)) {
        current.name = line.replace(/^    name:\s*/, "").replace(/"/g, "");
      } else if (inWindow && line.match(/^    verdict:/)) {
        const v = line.replace(/^    verdict:\s*/, "").trim();
        current.verdict = v === "block" ? "block" : "warn";
      } else if (inWindow && line.match(/^    recurrence:/)) {
        current.recurrence = { type: "range" };
        inRecurrence = true;
      } else if (inRecurrence && line.match(/^      type:/)) {
        const t = line.replace(/^      type:\s*/, "").trim();
        current.recurrence!.type = t === "cron" ? "cron" : "range";
      } else if (inRecurrence && line.match(/^      start:/)) {
        current.recurrence!.start = line
          .replace(/^      start:\s*/, "")
          .replace(/"/g, "");
      } else if (inRecurrence && line.match(/^      end:/)) {
        current.recurrence!.end = line
          .replace(/^      end:\s*/, "")
          .replace(/"/g, "");
      } else if (
        line.match(/^  - id:/) === null &&
        line.match(/^    \w/) &&
        inRecurrence
      ) {
        inRecurrence = false;
      }
    }

    if (inWindow && current.id) {
      windows.push(current as WindowEntry);
    }

    return windows;
  } catch {
    return [];
  }
}

export async function configRoutes(app: FastifyInstance) {
  app.post(
    "/config/upload",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { yaml } = request.body as { yaml: string };

      if (!yaml || typeof yaml !== "string") {
        return reply.status(400).send({ error: "yaml field is required." });
      }

      const windows = parseWindows(yaml);

      await db.query(
        `INSERT INTO org_configs (org_id, raw_yaml, parsed_windows)
         VALUES ($1, $2, $3)
         ON CONFLICT (org_id) DO UPDATE
         SET raw_yaml = EXCLUDED.raw_yaml,
             parsed_windows = EXCLUDED.parsed_windows,
             updated_at = now()`,
        [request.org.id, yaml, JSON.stringify(windows)],
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
