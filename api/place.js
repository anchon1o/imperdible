// GET /api/place?reto=N  → el lugar de ese reto (nunca los futuros, salvo con clave de administración)
const { serverToday, getPlaces, isAdmin } = require("./_lib");

module.exports = async (req, res) => {
  const reto = parseInt(req.query.reto, 10);
  if (!(reto >= 1)) return res.status(400).json({ error: "reto no válido" });
  const admin = isAdmin(req);
  if (!admin && reto > serverToday() + 1) return res.status(403).json({ error: "Ese reto aún no está disponible" });
  const { list } = await getPlaces();
  const place = list[(reto - 1) % list.length];
  res.setHeader("Cache-Control", admin ? "no-store" : "public, s-maxage=300, max-age=60");
  res.status(200).json({ reto, place, count: admin ? list.length : undefined });
};
