-- Gaffer dagprijs
ALTER TABLE gaffers ADD COLUMN IF NOT EXISTS dagprijs numeric(10,2) DEFAULT 0;
ALTER TABLE gaffers ADD COLUMN IF NOT EXISTS weekprijs numeric(10,2) DEFAULT 0;

-- offerte_regels: use klus_id instead of offerte_id as primary key
-- (we store regels per klus, not per offerte)
ALTER TABLE offerte_regels ADD COLUMN IF NOT EXISTS klus_id uuid REFERENCES klussen(id) ON DELETE CASCADE;

-- Update existing rows (set klus_id from offerte_id where offerte_id matches a klus id)
UPDATE offerte_regels SET klus_id = offerte_id::uuid WHERE klus_id IS NULL;
