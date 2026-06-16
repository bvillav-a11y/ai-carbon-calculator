// SOURCE for the Gizmos worker. scripts/embed.mjs compiles this + index.html
// into gizmos-app/src/index.ts (one self-contained file). Edit logic HERE, then
// run `node scripts/embed.mjs`. Do NOT edit gizmos-app/src/index.ts by hand.
//
// NO imports: the Gizmos runtime loader does not resolve a bare `hono` import at
// runtime (a Hono worker 500s on load), so this is a plain Workers module.

// INDEX_HTML_B64 below is replaced with the base64 of index.html by embed.mjs.
const INDEX_HTML_B64 = "__INDEX_HTML_B64__";

const COLS = [
  "session_id", "server_time", "client_time", "quick_run", "ai_tool",
  "hardware", "output_ratio", "task_type", "interactive", "frequency",
  "tokens", "model", "gpu", "util", "pue", "grid", "carbon_kg",
  "explored", "edit_count",
  "dwell_ms", "opened_params", "opened_trace", "opened_advanced",
  "opened_confidence", "opened_assumptions", "clicked_share", "retook_survey",
];

function decodeHtml() {
  return new TextDecoder().decode(Uint8Array.from(atob(INDEX_HTML_B64), (ch) => ch.charCodeAt(0)));
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json" },
  });
}

let _schemaReady = false;
async function ensureTable(db) {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS responses (" +
    "session_id TEXT PRIMARY KEY, server_time TEXT NOT NULL, client_time TEXT, " +
    "quick_run INTEGER, ai_tool TEXT, hardware INTEGER, output_ratio INTEGER, " +
    "task_type INTEGER, interactive INTEGER, frequency INTEGER, tokens INTEGER, " +
    "model TEXT, gpu TEXT, util INTEGER, pue REAL, grid INTEGER, carbon_kg REAL, " +
    "explored INTEGER, edit_count INTEGER, dwell_ms INTEGER, opened_params INTEGER, " +
    "opened_trace INTEGER, opened_advanced INTEGER, opened_confidence INTEGER, " +
    "opened_assumptions INTEGER, clicked_share INTEGER, retook_survey INTEGER)"
  );
  // The prod table predates the telemetry columns; CREATE IF NOT EXISTS won't add
  // them, so best-effort ALTER each (SQLite throws on an existing column — ignore).
  // Once per worker instance.
  if (_schemaReady) return;
  const adds = ["dwell_ms INTEGER", "opened_params INTEGER", "opened_trace INTEGER",
    "opened_advanced INTEGER", "opened_confidence INTEGER", "opened_assumptions INTEGER",
    "clicked_share INTEGER", "retook_survey INTEGER"];
  for (let i = 0; i < adds.length; i++) {
    try { await db.exec("ALTER TABLE responses ADD COLUMN " + adds[i]); } catch (e) { /* exists */ }
  }
  _schemaReady = true;
}

async function collect(req, env) {
  let d;
  try { d = await req.json(); } catch (e) { return json({ ok: false, error: "bad json" }, 400); }
  const sid = d && d.sessionId;
  if (!sid) return json({ ok: false, error: "missing sessionId" }, 400);

  const db = env.DB;
  await ensureTable(db);
  const aiTool = Array.isArray(d.ai_tool) ? d.ai_tool.join("|") : (d.ai_tool ?? null);
  const params = [
    sid, new Date().toISOString(), d.clientTime ?? null, d.quickRun ? 1 : 0, aiTool,
    d.hardware ?? null, d.output_ratio ?? null, d.task_type ?? null, d.interactive ?? null,
    d.frequency ?? null, d.tokens ?? null, d.model ?? null, d.gpu ?? null, d.util ?? null,
    d.pue ?? null, d.grid ?? null, d.carbonKg ?? null, d.explored ? 1 : 0, d.editCount ?? 0,
    d.dwellMs ?? null, d.openedParams ? 1 : 0, d.openedTrace ? 1 : 0, d.openedAdvanced ? 1 : 0,
    d.openedConfidence ? 1 : 0, d.openedAssumptions ? 1 : 0, d.clickedShare ? 1 : 0, d.retookSurvey ? 1 : 0,
  ];
  const placeholders = COLS.map(() => "?").join(", ");
  const updates = COLS.filter((col) => col !== "session_id").map((col) => col + "=excluded." + col).join(", ");
  await db.run(
    "INSERT INTO responses (" + COLS.join(", ") + ") VALUES (" + placeholders + ") " +
    "ON CONFLICT(session_id) DO UPDATE SET " + updates,
    ...params
  );
  console.log("collect ok:", sid, "quickRun=" + (d.quickRun ? 1 : 0));
  return json({ ok: true });
}

async function exportCsv(env) {
  const db = env.DB;
  await ensureTable(db);
  const { results } = await db.prepare("SELECT " + COLS.join(", ") + " FROM responses ORDER BY server_time").all();
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = (results || []).map((r) => COLS.map((col) => esc(r[col])).join(","));
  const csv = [COLS.join(","), ...rows].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="responses.csv"',
    },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    try {
      if (req.method === "GET" && path === "/") {
        return new Response(decodeHtml(), { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      // NOTE: paths must NOT start with /api/ — the gizmos platform reserves
      // /api/* for its own management API and blocks app POSTs to it. Use
      // plain app paths (/collect, /export) instead.
      if (req.method === "POST" && path === "/collect") return await collect(req, env);
      if (req.method === "GET" && path === "/export") return await exportCsv(env);
      return new Response("Not found", { status: 404 });
    } catch (e) {
      console.error("worker error on " + path + ":", String(e));
      return new Response("error: " + String(e), { status: 500 });
    }
  },
};
