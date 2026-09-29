// GET /api/train?region=all|eu|am|af|as → un lugar al azar para el modo adestramento
// Evita los lugares de los próximos 60 retos diarios para no destripar ninguno.
const { placeIdx, serverToday, getPlaces } = require("./_lib");
function regionOf(lat, lon){ if (lat > 35 && lat < 72 && lon > -25 && lon < 45) return "eu"; if (lon < -30) return "am"; if (lat > -35 && lat < 37 && lon > -20 && lon < 52) return "af"; return "as"; }
module.exports = async (req, res) => {
  const region = ["all","eu","am","af","as"].includes(req.query.region) ? req.query.region : "all";
  const { list } = await getPlaces();
  const len = list.length, base = placeIdx(serverToday(), len), skip = Math.min(61, len - 1);
  let pool = list.filter((p, i) => ((i - base + len) % len) >= skip && (region === "all" || regionOf(p.lat, p.lon) === region));
  if (!pool.length) pool = list;
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ place: pool[Math.floor(Math.random() * pool.length)] });
};
