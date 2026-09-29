// GET  /api/scores?reto=N&from=M&device=ID → ranking del día, semana (5 mejores de 7), mes (desde el reto M) y siempre
// POST /api/scores {device, secret, alias, reto, points, found, tries, deg, ms} → publica la puntuación de un día
const { MAX_TRIES, serverToday, hasDb, db, init, sha, body } = require("./_lib");

const int = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };

module.exports = async (req, res) => {
  if (!hasDb()) return res.status(503).json({ error: "Sin base de datos configurada" });
  try { await init(); } catch (e) { return res.status(503).json({ error: "Base de datos no disponible" }); }

  if (req.method === "GET"){
    const reto = int(req.query.reto, 0, 100000);
    if (reto == null) return res.status(400).json({ error: "reto no válido" });
    const device = String(req.query.device || "");
    const day = await db().query(
      `SELECT p.alias, s.points, s.found, s.tries, s.deg, s.ms, (s.device = $2) AS mine
         FROM imp_scores s JOIN imp_players p USING (device)
        WHERE s.reto = $1 ORDER BY s.points DESC, s.ms ASC LIMIT 50`, [reto, device]);
    const week = await db().query(
      `SELECT p.alias, SUM(t.points)::int AS points, MAX(t.played)::int AS days, (t.device = $2) AS mine
         FROM (SELECT device, points,
                      ROW_NUMBER() OVER (PARTITION BY device ORDER BY points DESC) AS rn,
                      COUNT(*) OVER (PARTITION BY device) AS played
                 FROM imp_scores WHERE reto BETWEEN $1 - 6 AND $1) t
         JOIN imp_players p USING (device)
        WHERE t.rn <= 5 GROUP BY p.alias, t.device ORDER BY points DESC LIMIT 50`, [reto, device]);
    const from = Math.max(0, Math.min(reto, int(req.query.from, 0, 100000) ?? reto));
    const range = (a, b) => db().query(
      `SELECT p.alias, SUM(s.points)::int AS points, COUNT(*)::int AS days, (s.device = $3) AS mine
         FROM imp_scores s JOIN imp_players p USING (device)
        WHERE s.reto BETWEEN $1 AND $2 GROUP BY p.alias, s.device ORDER BY points DESC LIMIT 50`, [a, b, device]);
    const month = await range(from, reto);
    const all = await range(0, reto);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ day: day.rows, week: week.rows, month: month.rows, all: all.rows });
  }

  if (req.method === "POST"){
    const b = await body(req);
    const device = String(b.device || ""), secret = String(b.secret || "");
    const alias = String(b.alias || "").replace(/\s+/g, " ").trim().slice(0, 20);
    const reto = int(b.reto, 0, serverToday() + 1);
    const points = int(b.points, 0, 1000), tries = int(b.tries, 1, MAX_TRIES), deg = int(b.deg, 0, 100), ms = int(b.ms, 0, 86400000);
    const found = b.found === true || b.found === 1;
    if (device.length < 8 || device.length > 100 || secret.length < 16 || secret.length > 200) return res.status(400).json({ error: "identificador no válido" });
    if (!alias) return res.status(400).json({ error: "falta el nombre" });
    if (reto == null || points == null || tries == null || deg == null || ms == null) return res.status(400).json({ error: "datos no válidos" });
    // coherencia básica con las reglas de puntuación
    if (found && (deg !== 100 || points < 600 || points > 600 + 40 * (MAX_TRIES - tries) + 40)) return res.status(400).json({ error: "puntuación incoherente" });
    if (!found && (tries !== MAX_TRIES || points !== 5 * Math.min(99, deg))) return res.status(400).json({ error: "puntuación incoherente" });

    const client = await db().connect();
    try {
      const cur = await client.query("SELECT secret_hash FROM imp_players WHERE device = $1", [device]);
      if (cur.rows.length && cur.rows[0].secret_hash !== sha(secret)) return res.status(403).json({ error: "identificador en uso" });
      if (cur.rows.length) await client.query("UPDATE imp_players SET alias = $2 WHERE device = $1", [device, alias]);
      else await client.query("INSERT INTO imp_players (device, secret_hash, alias) VALUES ($1, $2, $3)", [device, sha(secret), alias]);
      // una sola puntuación por persona y día: la primera que se publica
      await client.query(
        `INSERT INTO imp_scores (device, reto, points, found, tries, deg, ms) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (device, reto) DO NOTHING`, [device, reto, points, found, tries, deg, ms]);
      return res.status(200).json({ ok: true });
    } finally { client.release(); }
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).end();
};
