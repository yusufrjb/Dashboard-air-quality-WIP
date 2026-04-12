-- tb_predictions table for storing pre-computed predictions
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tb_predictions (
    id SERIAL PRIMARY KEY,
    target_at TIMESTAMP NOT NULL,
    pm25 NUMERIC(10, 2) NOT NULL,
    pm10 NUMERIC(10, 2) NOT NULL,
    co NUMERIC(10, 2) NOT NULL,
    ispu NUMERIC(10, 2),
    category VARCHAR(50),
    dominant VARCHAR(20),
    color VARCHAR(20),
    confidence NUMERIC(5, 4),
    generated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_predictions_target_at ON tb_predictions(target_at);
CREATE INDEX IF NOT EXISTS idx_predictions_generated_at ON tb_predictions(generated_at);

-- Disable RLS for simplicity (or configure properly)
ALTER TABLE tb_predictions DISABLE ROW LEVEL SECURITY;