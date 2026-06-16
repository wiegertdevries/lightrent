-- LightRent Pro v3 - Run in Supabase SQL Editor

-- Standaard gaffers aanmaken
INSERT INTO gaffers (naam, email, telefoon) VALUES
  ('Wiegert de Vries', '', ''),
  ('Julian den Ouden', '', ''),
  ('Gideon Post', '', '')
ON CONFLICT DO NOTHING;

-- Honda EU70IS als gear item toevoegen
INSERT INTO gear (naam, categorie, dagprijs, weekprijs, notities) VALUES
  ('Honda EU70IS Generator', 'Overig', 75, 225, 'Benzine aggregaat 7kVA - eigenaar: Wiegert')
ON CONFLICT DO NOTHING;

-- Offerte regels tabel voor flexibele offerte bewerking
CREATE TABLE IF NOT EXISTS offerte_regels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offerte_id uuid REFERENCES offertes(id) ON DELETE CASCADE,
  volgorde integer DEFAULT 0,
  type text DEFAULT 'gear', -- 'gear' | 'accessory' | 'transport' | 'generator' | 'korting' | 'custom'
  omschrijving text NOT NULL,
  gear_id uuid REFERENCES gear(id) ON DELETE SET NULL,
  dagprijs numeric(10,2) DEFAULT 0,
  dagen integer DEFAULT 1,
  subtotaal numeric(12,2) DEFAULT 0,
  korting_pct numeric(5,2) DEFAULT 0,
  korting_bedrag numeric(12,2) DEFAULT 0,
  is_korting_regel boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE offerte_regels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offerte_regels toegang" ON offerte_regels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Factuur regels tabel
CREATE TABLE IF NOT EXISTS factuur_regels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factuur_id uuid REFERENCES facturen(id) ON DELETE CASCADE,
  volgorde integer DEFAULT 0,
  type text DEFAULT 'gear',
  omschrijving text NOT NULL,
  gear_id uuid REFERENCES gear(id) ON DELETE SET NULL,
  dagprijs numeric(10,2) DEFAULT 0,
  dagen integer DEFAULT 1,
  subtotaal numeric(12,2) DEFAULT 0,
  korting_pct numeric(5,2) DEFAULT 0,
  korting_bedrag numeric(12,2) DEFAULT 0,
  is_korting_regel boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE factuur_regels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "factuur_regels toegang" ON factuur_regels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Extra kolommen op offertes
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS staffelkorting_pct numeric(5,2) DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS staffelkorting_bedrag numeric(12,2) DEFAULT 0;
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS regels_versie integer DEFAULT 2; -- 2 = uses offerte_regels table
ALTER TABLE facturen ADD COLUMN IF NOT EXISTS regels_versie integer DEFAULT 2;
