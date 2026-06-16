-- Fix: disable RLS on gaffers so insert always works
ALTER TABLE gaffers DISABLE ROW LEVEL SECURITY;

-- Fix: disable RLS on offerte_regels too
ALTER TABLE offerte_regels DISABLE ROW LEVEL SECURITY;
ALTER TABLE factuur_regels DISABLE ROW LEVEL SECURITY;

-- Seed default gaffers (skip if already exist)
INSERT INTO gaffers (naam) 
SELECT naam FROM (VALUES ('Wiegert de Vries'), ('Julian den Ouden'), ('Gideon Post')) AS t(naam)
WHERE NOT EXISTS (SELECT 1 FROM gaffers WHERE gaffers.naam = t.naam);

-- Klus: add offerte fields directly on klus
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS offerte_nummer text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS offerte_datum date;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS offerte_geldig_tot date;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS offerte_status text DEFAULT 'concept';
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS offerte_intro text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS offerte_notities text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS offerte_verstuurd_op timestamptz;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS factuur_nummer text;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS factuur_datum date;
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS factuur_status text DEFAULT 'onbetaald';
ALTER TABLE klussen ADD COLUMN IF NOT EXISTS factuur_betaald_op date;
