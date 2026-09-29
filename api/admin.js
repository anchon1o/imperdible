// Panel de administración (requiere la cabecera x-admin-key = ADMIN_KEY)
// GET    /api/admin              → lista completa de lugares y de dónde sale (db o archivo incluido)
// PUT    /api/admin {list}       → guarda la lista en la base de datos
// DELETE /api/admin?alias=Nombre → quita del ranking a quien use ese nombre (moderación)
const { BUNDLED, serverToday, hasDb, db, init, getPlaces, isAdmin, body } = require("./_lib");
const LANGS = ["es", "gl", "ca", "eu"];

function clean(p){
  const lat = Number(p.lat), lon = Number(p.lon);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const es = Array.isArray(p.es) ? p.es : null;
  if (!es || !String(es[0] || "").trim()) return null;
  const o = { lat: Math.round(lat * 10000) / 10000, lon: Math.round(lon * 10000) / 10000 };
  for (const l of LANGS){
    const v = Array.isArray(p[l]) ? p[l] : es;
    o[l] = [String(v[0] || es[0]).trim().slice(0, 80), String(v[1] || es[1] || "").trim().slice(0, 80)];
  }
  return o;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.ADMIN_KEY) return res.status(503).json({ error: "Falta la variable ADMIN_KEY en Vercel" });
  if (!isAdmin(req)) return res.status(401).json({ error: "Clave incorrecta" });

  if (req.method === "GET"){
    if (req.query.bundled) return res.status(200).json({ list: BUNDLED, source: "bundled" });
    const { list, source } = await getPlaces();
    return res.status(200).json({ list, source, today: serverToday(), bundledCount: BUNDLED.length, db: hasDb() });
  }
  if (!hasDb()) return res.status(503).json({ error: "Sin base de datos: conecta una en Vercel (Storage) para poder guardar" });
  await init();

  if (req.method === "PUT"){
    const b = await body(req);
    if (!Array.isArray(b.list) || !b.list.length) return res.status(400).json({ error: "lista vacía" });
    const list = [];
    for (let i = 0; i < b.list.length; i++){
      const c = clean(b.list[i]);
      if (!c) return res.status(400).json({ error: `El lugar nº ${i + 1} no es válido (nombre en castellano y coordenadas)` });
      list.push(c);
    }
    await db().query(
      `INSERT INTO imp_config (key, value, updated_at) VALUES ('places', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [JSON.stringify(list)]);
    return res.status(200).json({ ok: true, count: list.length });
  }
  if (req.method === "DELETE"){
    const alias = String(req.query.alias || "").trim();
    if (!alias) return res.status(400).json({ error: "falta alias" });
    const r = await db().query("DELETE FROM imp_players WHERE lower(alias) = lower($1)", [alias]);
    return res.status(200).json({ ok: true, removed: r.rowCount });
  }
  res.setHeader("Allow", "GET, PUT, DELETE");
  return res.status(405).end();
};
