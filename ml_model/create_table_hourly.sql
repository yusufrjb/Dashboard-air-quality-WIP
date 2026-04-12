-- tb_prediksi_hourly: Multi-parameter forecast (PM2.5, PM10, CO, ISPU)
-- Prediksi 60 menit ke depan, dijalankan setiap 5 menit

CREATE TABLE IF NOT EXISTS tb_prediksi_hourly (
    id             BIGSERIAL PRIMARY KEY,
    forecast_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    target_at      TIMESTAMPTZ NOT NULL,
    pm25_pred     FLOAT NOT NULL,
    pm10_pred     FLOAT NOT NULL,
    co_pred       FLOAT NOT NULL,
    ispu          FLOAT NOT NULL,
    category      VARCHAR(50),
    is_historical BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_hourly_target_at ON tb_prediksi_hourly (target_at DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_forecast_at ON tb_prediksi_hourly (forecast_at DESC);

-- Hapus data lama (> 24 jam)
DELETE FROM tb_prediksi_hourly WHERE target_at < NOW() - INTERVAL '24 hours';

-- RLS: Allow INSERT/UPDATE/DELETE for authenticated and anon
ALTER TABLE tb_prediksi_hourly ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk anon (service_role key bypasses RLS, anon key needs policy)
DROP POLICY IF EXISTS "Allow anon insert" ON tb_prediksi_hourly;
CREATE POLICY "Allow anon insert" ON tb_prediksi_hourly
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select" ON tb_prediksi_hourly;
CREATE POLICY "Allow anon select" ON tb_prediksi_hourly
    FOR SELECT TO anon, authenticated
    USING (true);
