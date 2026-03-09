import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Holt-Winters Double Exponential Smoothing — fallback jika belum ada model XGBoost
// ---------------------------------------------------------------------------
function holtSmoothing(data: number[], alpha = 0.3, beta = 0.1) {
    if (data.length < 2) return { level: data[0] ?? 0, trend: 0 };
    let level = data[0];
    let trend = data[1] - data[0];
    for (let i = 1; i < data.length; i++) {
        const prevLevel = level;
        level = alpha * data[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    return { level, trend };
}

function holtForecast(historicalValues: number[], historicalTimes: Date[], steps = 30) {
    const recent = historicalValues.slice(-30);
    const { level, trend } = holtSmoothing(recent, 0.35, 0.08);
    const results = [];

    // Historis
    for (let i = 0; i < historicalValues.length; i++) {
        results.push({
            time: historicalTimes[i].toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            pm25: Number(historicalValues[i].toFixed(1)),
            isHistorical: true,
            timestamp: historicalTimes[i].getTime(),
        });
    }

    // Prediksi dengan damping
    let dampedTrend = trend;
    let forecastLevel = level;
    const lastTime = historicalTimes[historicalTimes.length - 1];
    for (let step = 1; step <= steps; step++) {
        dampedTrend *= 0.92;
        forecastLevel += dampedTrend;
        const clamped = Math.max(0, Math.min(300, forecastLevel));
        const t = new Date(lastTime.getTime() + step * 60000);
        results.push({
            time: t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            pm25: Number(clamped.toFixed(1)),
            isHistorical: false,
            timestamp: t.getTime(),
        });
    }
    return results;
}

// ---------------------------------------------------------------------------
// API Route
// ---------------------------------------------------------------------------
export async function GET() {
    try {
        const sixtyMin = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        // 1. Ambil data historis aktual
        const { data: histData, error: histErr } = await supabase
            .from('tb_konsentrasi_gas')
            .select('pm25_ugm3, created_at')
            .gte('created_at', sixtyMin)
            .order('created_at', { ascending: true })
            .limit(200);

        if (histErr) {
            return NextResponse.json({ error: histErr.message }, { status: 500 });
        }

        const clean = (histData ?? [])
            .filter(d => d.pm25_ugm3 !== null && d.pm25_ugm3 >= 0 && d.pm25_ugm3 < 300)
            .map(d => ({ value: Number(d.pm25_ugm3), time: new Date(d.created_at) }));

        const latestPm25 = clean.length ? clean[clean.length - 1].value : 0;
        const histPoints = clean.map(d => ({
            time: d.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            pm25: Number(d.value.toFixed(1)),
            isHistorical: true,
            timestamp: d.time.getTime(),
        }));

        // 2. Coba ambil prediksi XGBoost dari Supabase (hasil predict_and_save.py)
        //    Ambil batch prediksi terbaru (forecast_at terbaru)
        const { data: xgbPredLatest } = await supabase
            .from('tb_prediksi_pm25')
            .select('forecast_at')
            .order('forecast_at', { ascending: false })
            .limit(1);

        let forecastPoints: any[] = [];
        let method = 'Holt-Winters (Fallback)';
        let forecastedIn30 = latestPm25;

        if (xgbPredLatest && xgbPredLatest.length > 0) {
            const latestForecastAt = xgbPredLatest[0].forecast_at;

            const { data: xgbData } = await supabase
                .from('tb_prediksi_pm25')
                .select('target_at, pm25_pred')
                .eq('forecast_at', latestForecastAt)
                .order('target_at', { ascending: true });

            if (xgbData && xgbData.length > 0) {
                forecastPoints = xgbData.map(r => ({
                    time: new Date(r.target_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    pm25: Number(r.pm25_pred.toFixed(1)),
                    isHistorical: false,
                    timestamp: new Date(r.target_at).getTime(),
                }));
                forecastedIn30 = forecastPoints[forecastPoints.length - 1]?.pm25 ?? latestPm25;
                method = `LightGBM (Diperbarui: ${new Date(latestForecastAt).toLocaleString('id-ID')})`;
            }
        }

        // 3. Jika tidak ada prediksi XGBoost, gunakan Holt-Winters sebagai fallback
        let allPoints: any[];
        if (forecastPoints.length === 0) {
            if (clean.length >= 3) {
                allPoints = holtForecast(clean.map(c => c.value), clean.map(c => c.time), 30);
                forecastedIn30 = allPoints.filter(p => !p.isHistorical).pop()?.pm25 ?? latestPm25;
            } else {
                allPoints = histPoints;
            }
        } else {
            // Gabung: historis aktual + prediksi XGBoost
            allPoints = [...histPoints, ...forecastPoints];
        }

        // 4. Hitung arah tren
        const recentSlice = clean.map(d => d.value).slice(-10);
        const avgStart = recentSlice.slice(0, 5).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(5, recentSlice.length));
        const avgEnd = recentSlice.slice(5).reduce((a, b) => a + b, 0) / Math.max(1, recentSlice.slice(5).length);
        const trendDirection = avgEnd - avgStart > 1 ? 'naik' : avgEnd - avgStart < -1 ? 'turun' : 'stabil';

        return NextResponse.json({
            forecast: allPoints,
            metadata: {
                dataPoints: clean.length,
                latestPm25,
                forecastedIn30min: forecastedIn30,
                trendDirection,
                method,
                usingXGBoost: forecastPoints.length > 0,
            },
        });
    } catch (err) {
        console.error('[/api/forecast]', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
