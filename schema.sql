-- Imperdible: táboas con prefixo imp_ (opcional: a API créaas soa na primeira chamada)
CREATE TABLE IF NOT EXISTS imp_config (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS imp_players (device text PRIMARY KEY, secret_hash text NOT NULL, alias text NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS imp_scores (
  device text NOT NULL REFERENCES imp_players(device) ON DELETE CASCADE,
  reto int NOT NULL, points int NOT NULL, found boolean NOT NULL, tries int NOT NULL, deg int NOT NULL, ms int NOT NULL,
  created_at timestamptz DEFAULT now(), PRIMARY KEY (device, reto));
CREATE INDEX IF NOT EXISTS imp_scores_reto ON imp_scores (reto);
-- RLS activado e sen políticas: a API pública de Supabase non pode ler nin escribir nestas táboas.
-- O xogo accede só a través das funcións de Vercel, que usan a conexión directa.
ALTER TABLE imp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE imp_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE imp_scores ENABLE ROW LEVEL SECURITY;
