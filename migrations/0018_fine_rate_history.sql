-- Parent: Fines Platform Wave C — append-only daily rate audit trail
CREATE TABLE IF NOT EXISTS fine_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate numeric(10, 2) NOT NULL,
  effective_from date NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fine_rate_history_effective_from_idx
  ON fine_rate_history (effective_from DESC);

-- Seed current rate from system_config when table is empty
INSERT INTO fine_rate_history (rate, effective_from, created_by)
SELECT
  COALESCE(NULLIF(sc.value, '')::numeric, 1.00),
  CURRENT_DATE,
  COALESCE(sc.updated_by, 'system')
FROM system_config sc
WHERE sc.key = 'daily_fine_amount'
  AND NOT EXISTS (SELECT 1 FROM fine_rate_history LIMIT 1);
