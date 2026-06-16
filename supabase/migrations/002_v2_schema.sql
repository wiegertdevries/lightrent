-- ============================================================
-- LightRent Pro v2.0 - Database uitbreidingen
-- Run this in Supabase SQL Editor AFTER 001_schema.sql
-- ============================================================

-- ── GEBRUIKERS / PROFIELEN ───────────────────────────────────
CREATE TABLE IF NOT EXISTS profielen (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  naam text NOT NULL,
  email text,
  rol text NOT NULL DEFAULT 'medewerker', -- 'admin' | 'medewerker'
  bedrijfsnaam text,
  bedrijfsadres text,
  bedrijfspostcode text,
  bedrijfsplaats text,
  kvk_nummer text,
  btw_nummer text,
  iban text,
  telefoon text,
  logo_url text,
  kleur_primair text DEFAULT '#F97316',
  created_at timestamptz DEFAULT now()
);

-- RLS voor profielen
ALTER TABLE profielen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigen profiel lezen" ON profielen FOR SELECT TO authenticated USING (true);
CREATE POLICY "Eigen profiel bewerken" ON profielen FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin profiel aanmaken" ON profielen FOR INSERT TO authenticated WITH CHECK (true);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  user_naam text,
  actie text NOT NULL, -- 'aangemaakt' | 'gewijzigd' | 'verwijderd'
  tabel text NOT NULL,
  record_id text,
  omschrijving text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit log lezen" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Audit log schrijven" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ── GEAR UITBREIDINGEN ────────────────────────────────────────
ALTER TABLE gear ADD COLUMN IF NOT EXISTS stelling text;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS plank text;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS foto_url text;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS status text DEFAULT 'beschikbaar'; -- 'beschikbaar' | 'defect' | 'reparatie' | 'vermist'
ALTER TABLE gear ADD COLUMN IF NOT EXISTS defect_notitie text;
ALTER TABLE gear ADD COLUMN IF NOT EXISTS laatste_bus_id uuid REFERENCES bussen(id);
ALTER TABLE gear ADD COLUMN IF NOT EXISTS barcode text;

-- ── KLANT UITBREIDINGEN ───────────────────────────────────────
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS kvk_nummer text;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS postcode text;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS stad text;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS land text DEFAULT 'Nederland';
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS notities text;
ALTER TABLE klanten ADD COLUMN IF NOT EXISTS aangemaakt_door uuid REFERENCES auth.users(id);

-- ── KLUS UITBREIDINGEN ────────────────────────────────────────
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS aangemaakt_door uuid REFERENCES auth.users(id);
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS aangemaakt_door_naam text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS locatie text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS referentie text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS interne_notities text;

-- ── OFFERTE UITBREIDINGEN ─────────────────────────────────────
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS aangemaakt_door uuid REFERENCES auth.users(id);
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS aangemaakt_door_naam text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS onderwerp text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS intro_tekst text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS footer_tekst text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS algemene_voorwaarden_url text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS korting_type text DEFAULT 'percentage'; -- 'percentage' | 'bedrag'
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS korting_per_regel jsonb DEFAULT '[]';
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS online_acceptatie_token text UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geaccepteerd_op timestamptz;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS geaccepteerd_door text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bedrijfsnaam text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bedrijfsadres text;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bedrijfsbtw text;

-- ── FACTUUR UITBREIDINGEN ─────────────────────────────────────
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS aangemaakt_door uuid REFERENCES auth.users(id);
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS aangemaakt_door_naam text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS onderwerp text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS intro_tekst text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS footer_tekst text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS algemene_voorwaarden_url text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS korting_type text DEFAULT 'percentage';
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaald_bedrag numeric(12,2) DEFAULT 0;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betaald_op date;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS betalingsherinnering_op date;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bedrijfsnaam text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bedrijfsadres text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS bedrijfsbtw text;
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS referentie text;

-- ── BESTANDEN / UPLOADS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bestanden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naam text NOT NULL,
  type text NOT NULL, -- 'algemene_voorwaarden' | 'logo' | 'gear_foto'
  url text NOT NULL,
  grootte integer,
  geupload_door uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bestanden ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bestanden toegang" ON bestanden FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── NOTITIES (dashboard sticky notes) ────────────────────────
CREATE TABLE IF NOT EXISTS notities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tekst text NOT NULL,
  prioriteit text DEFAULT 'normaal', -- 'laag' | 'normaal' | 'hoog' | 'urgent'
  gear_id uuid REFERENCES gear(id) ON DELETE SET NULL,
  aangemaakt_door uuid REFERENCES auth.users(id),
  aangemaakt_door_naam text,
  afgehandeld boolean DEFAULT false,
  afgehandeld_op timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notities toegang" ON notities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── PAKLIJST ITEMS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paklijst_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  klus_id uuid REFERENCES klussen(id) ON DELETE CASCADE,
  gear_id uuid REFERENCES gear(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES bussen(id) ON DELETE SET NULL,
  ingepakt boolean DEFAULT false,
  ingepakt_door text,
  ingepakt_op timestamptz,
  retour_ontvangen boolean DEFAULT false,
  retour_staat text, -- 'goed' | 'beschadigd' | 'vermist'
  retour_notitie text
);
ALTER TABLE paklijst_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Paklijst toegang" ON paklijst_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── BETALINGSHERINNERINGEN ────────────────────────────────────
CREATE TABLE IF NOT EXISTS herinneringen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factuur_id uuid REFERENCES facturen(id) ON DELETE CASCADE,
  verstuurd_op date,
  type text DEFAULT 'eerste', -- 'eerste' | 'tweede' | 'laatste'
  notitie text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE herinneringen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herinneringen toegang" ON herinneringen FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── INSTELLINGEN ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instellingen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sleutel text UNIQUE NOT NULL,
  waarde jsonb,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE instellingen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Instellingen lezen" ON instellingen FOR SELECT TO authenticated USING (true);
CREATE POLICY "Instellingen schrijven" ON instellingen FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Standaard instellingen
INSERT INTO instellingen (sleutel, waarde) VALUES
  ('factuur_prefix', '"FAC"'),
  ('offerte_prefix', '"OFF"'),
  ('btw_tarief', '21'),
  ('betalingstermijn_dagen', '30'),
  ('offerte_geldigheid_dagen', '14'),
  ('factuur_footer', '"Bedankt voor uw opdracht. Vragen? Neem contact met ons op."'),
  ('offerte_intro', '"Graag doen wij u een offerte toekomen voor de huur van onderstaande apparatuur."')
ON CONFLICT (sleutel) DO NOTHING;

-- ── SUPABASE STORAGE BUCKETS (run separately if needed) ──────
-- Maak in Supabase dashboard onder Storage deze buckets aan:
-- - 'logos' (public)
-- - 'algemene-voorwaarden' (public)  
-- - 'gear-fotos' (public)

-- ── KLUS SJABLOON ─────────────────────────────────────────────
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS is_sjabloon boolean DEFAULT false;

-- ── UPDATE GENERATOR EIGENAREN ────────────────────────────────
UPDATE generators SET eigenaar = 'Gideon' WHERE naam ILIKE '%60KVA%';
UPDATE generators SET eigenaar = 'Wiegert' WHERE naam ILIKE '%Honda%' OR naam ILIKE '%EU70%';

-- ── GAFFERS tabel ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gaffers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naam text NOT NULL,
  email text,
  telefoon text,
  bedrijf text,
  notities text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE gaffers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gaffers toegang" ON gaffers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── KLUS uitbreidingen ────────────────────────────────────────
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS gaffer_id uuid REFERENCES gaffers(id) ON DELETE SET NULL;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS klus_nummer text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS status_v2 text DEFAULT 'in_optie'; -- 'in_optie'|'bevestigd'|'uitgevoerd'|'gefactureerd'

-- ── PAKLIJST per klus ─────────────────────────────────────────
-- (paklijst_items tabel already exists from 002_v2_schema.sql)
-- Add reservebulb tracking
ALTER TABLE paklijst_items ADD COLUMN IF NOT EXISTS reservebulb_gepakt boolean DEFAULT false;

-- Bus dagprijs update
UPDATE bussen SET dagprijs = 550 WHERE naam ILIKE '%Atego%';

-- ── NIEUWE GEAR SETS ──────────────────────────────────────────
-- Titan set van 8
INSERT INTO gear (naam, categorie, dagprijs, weekprijs, notities) VALUES
  ('Astera Titan Tube SET (8x)', 'LED', 250, 750, '8 Titan Tubes als complete set'),
  ('Astera AX9 SET (8x)', 'LED', 250, 750, '8 AX9 PowerPAR als complete set'),
  ('Astera Helios Tube SET A (4x)', 'LED', 100, 300, '4 Helios Tubes als complete set'),
  ('Astera Helios Tube SET B (4x)', 'LED', 100, 300, '4 Helios Tubes als complete set'),
  ('Astera Hydrapanel SET A (4x)', 'LED', 75, 225, '4 Hydrapanels als complete set'),
  ('Astera Hydrapanel SET B (4x)', 'LED', 75, 225, '4 Hydrapanels als complete set')
ON CONFLICT DO NOTHING;
