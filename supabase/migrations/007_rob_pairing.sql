-- 007: Appariement des brides robinetterie (ADM/REF)
-- Permet de lier 2 brides d'un même ITEM pour former une vanne

ALTER TABLE flanges ADD COLUMN IF NOT EXISTS rob_pair_id UUID;
ALTER TABLE flanges ADD COLUMN IF NOT EXISTS rob_side TEXT CHECK (rob_side IN ('ADM', 'REF'));

-- Index pour grouper par paire
CREATE INDEX IF NOT EXISTS idx_flanges_rob_pair ON flanges(rob_pair_id) WHERE rob_pair_id IS NOT NULL;

-- Unicité : 1 seul ADM et 1 seul REF par paire
CREATE UNIQUE INDEX IF NOT EXISTS uq_flanges_pair_side ON flanges(rob_pair_id, rob_side) WHERE rob_pair_id IS NOT NULL;
