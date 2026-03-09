-- ============================================================
-- Jalankan SQL ini di Supabase SQL Editor untuk membuat tabel
-- yang menyimpan hasil prediksi PM2.5 dari model XGBoost.
-- ============================================================

CREATE TABLE IF NOT EXISTS tb_prediksi_pm25 (
  id           BIGSERIAL PRIMARY KEY,
  forecast_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- kapan prediksi dibuat
  target_at    TIMESTAMPTZ NOT NULL,                -- waktu yang diprediksi
  pm25_pred    FLOAT NOT NULL,                      -- nilai prediksi PM2.5 (µg/m³)
  is_historical BOOLEAN DEFAULT false
);

-- Index agar query ke target_at cepat
CREATE INDEX IF NOT EXISTS idx_prediksi_target_at
  ON tb_prediksi_pm25 (target_at DESC);

-- Hapus prediksi lama (lebih dari 3 hari) otomatis
-- Jalankan manual atau buat scheduled function di Supabase
-- DELETE FROM tb_prediksi_pm25 WHERE forecast_at < NOW() - INTERVAL '3 days';

-- Aktifkan Row Level Security (RLS) jika diperlukan
ALTER TABLE tb_prediksi_pm25 ENABLE ROW LEVEL SECURITY;

-- Izinkan semua akses untuk anon key (read-only untuk dashboard)
CREATE POLICY "Allow anonymous read"
  ON tb_prediksi_pm25
  FOR SELECT
  TO anon
  USING (true);

-- Izinkan service_role untuk write (digunakan oleh Python script)
CREATE POLICY "Allow service_role write"
  ON tb_prediksi_pm25
  FOR INSERT
  TO service_role
  WITH CHECK (true);
