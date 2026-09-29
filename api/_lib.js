// Utilidades compartidas por las funciones de la API (el guion bajo evita que Vercel lo publique como ruta)
const crypto = require("crypto");
const { Pool } = require("pg");
const BUNDLED = require("../data/places.json");

const EPOCH_UTC = Date.UTC(2026, 9, 1); // reto nº 1 = 01/10/2026 (o 30/09/2026 é o nº 0)
const MAX_TRIES = 10;

function placeIdx(n, len){ return (((n - 1) % len) + len) % len; }
function serverToday(){ return Math.floor((Date.now() - EPOCH_UTC) / 86400000) + 1; }

let pool = null, ready = null;
function hasDb(){ return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL); }
function db(){
  if (!pool){
    // Supabase/Vercel engaden ?sslmode=require: quítase para que valga a configuración SSL de abaixo
    // (se non, node-postgres intenta verificar o certificado do pooler e falla con "self-signed certificate")
    const cs = String(process.env.DATABASE_URL || process.env.POSTGRES_URL).replace(/([?&])sslmode=[^&]*(&|$)/, "$1").replace(/[?&]$/, "");
    const local = /localhost|127\.0\.0\.1/.test(cs);
    pool = new Pool({ connectionString: cs, ssl: local ? false : { rejectUnauthorized: false }, max: 3 });
  }
  return pool;
}
async function init(){
  if (!ready){
    ready = db().query(`
      CREATE TABLE IF NOT EXISTS imp_config (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS imp_players (device text PRIMARY KEY, secret_hash text NOT NULL, alias text NOT NULL, created_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS imp_scores (
        device text NOT NULL REFERENCES imp_players(device) ON DELETE CASCADE,
        reto int NOT NULL, points int NOT NULL, found boolean NOT NULL, tries int NOT NULL, deg int NOT NULL, ms int NOT NULL,
        created_at timestamptz DEFAULT now(), PRIMARY KEY (device, reto));
      CREATE INDEX IF NOT EXISTS imp_scores_reto ON imp_scores (reto);
      ALTER TABLE imp_config ENABLE ROW LEVEL SECURITY;
      ALTER TABLE imp_players ENABLE ROW LEVEL SECURITY;
      ALTER TABLE imp_scores ENABLE ROW LEVEL SECURITY;
    `).catch(e => { ready = null; throw e; });
  }
  return ready;
}

async function getPlaces(){
  if (!hasDb()) return { list: BUNDLED, source: "bundled" };
  try {
    await init();
    const r = await db().query("SELECT value FROM imp_config WHERE key = 'places'");
    if (r.rows.length && Array.isArray(r.rows[0].value) && r.rows[0].value.length) return { list: r.rows[0].value, source: "db" };
  } catch (e) { console.error("getPlaces", e.message); }
  return { list: BUNDLED, source: "bundled" };
}

function isAdmin(req){
  const key = process.env.ADMIN_KEY;
  if (!key) return false;
  const given = String(req.headers["x-admin-key"] || "");
  const a = Buffer.from(crypto.createHash("sha256").update(given).digest("hex"));
  const b = Buffer.from(crypto.createHash("sha256").update(key).digest("hex"));
  return crypto.timingSafeEqual(a, b);
}
function sha(s){ return crypto.createHash("sha256").update(String(s)).digest("hex"); }
async function body(req){
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(res => { let d = ""; req.on("data", c => d += c); req.on("end", () => { try { res(JSON.parse(d || "{}")); } catch (e) { res({}); } }); });
}
module.exports = { placeIdx, BUNDLED, MAX_TRIES, serverToday, hasDb, db, init, getPlaces, isAdmin, sha, body };
