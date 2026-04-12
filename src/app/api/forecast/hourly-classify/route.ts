import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const BP_PM25: number[][] = [[0,15,0,50],[15,35,50,100],[35,55,100,200],[55,150,200,300],[150,250,300,400],[250,350,400,500]];
const BP_PM10: number[][] = [[0,50,0,50],[50,150,50,100],[150,350,100,200],[350,420,200,300],[420,500,300,400],[500,600,400,500]];
const BP_CO: number[][] = [[0,5000,0,50],[5000,10000,50,100],[10000,17000,100,200],[17000,34000,200,300],[34000,46000,300,400],[46000,56000,400,500]];

const CAT_COLORS: Record<string, string> = {
    "Baik": "#10b981",
    "Sedang": "#3b82f6",
    "Tidak Sehat": "#f59e0b",
    "Sangat Tidak Sehat": "#ef4444",
    "Berbahaya": "#7c3aed",
};

function concToISPI(val: number, bp: number[][]): number {
    if (val <= 0) return 0;
    for (const [cl, ch, il, ih] of bp) {
        if (val <= ch) return il + (val - cl) / (ch - cl) * (ih - il);
    }
    return bp[bp.length - 1][3];
}

function getISPU(pm25: number, pm10: number, co: number, no2: number = 0, o3: number = 0): number {
    // ISPU max dari PM2.5, PM10, CO saja (bukan NO2/O3 yang tidak diprediksi)
    const ispis = [
        concToISPI(pm25, BP_PM25),
        concToISPI(pm10, BP_PM10),
        concToISPI(co, BP_CO),
    ];
    return Math.round(Math.max(...ispis) * 10) / 10;
}

function ispiToLabel(ispu: number): string {
    if (ispu <= 50) return "Baik";
    if (ispu <= 100) return "Sedang";
    if (ispu <= 200) return "Tidak Sehat";
    if (ispu <= 300) return "Sangat Tidak Sehat";
    return "Berbahaya";
}

function getDominant(pm25: number, pm10: number, co: number): string {
    // Dominant hanya berdasarkan parameter yang diprediksi (PM2.5, PM10, CO)
    // NO2 dan O3 tidak diprediksi, hanya используется untuk ISPU total
    const ispis: Record<string, number> = {
        "PM2.5": concToISPI(pm25, BP_PM25),
        "PM10": concToISPI(pm10, BP_PM10),
        "CO": concToISPI(co, BP_CO),
    };
    return Object.entries(ispis).reduce((a, b) => b[1] > a[1] ? b : a)[0];
}

export async function GET() {
    try {
        let forecastRows: any[] = [];
        let method = "XGBoost Hybrid (Pre-computed)";
        let source = "database";
        
        // Step 1: Try to get pre-computed predictions from Supabase DB
        // (Generated hourly by GitHub Actions)
        try {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            
            const { data: dbPredictions, error: dbError } = await supabase
                .from('tb_prediksi_hourly')
                .select('target_at, pm25_pred, pm10_pred, co_pred, ispu, category')
                .gte('target_at', oneHourAgo)
                .order('target_at', { ascending: true })
                .limit(60);
            
            if (dbError) {
                console.error('[/api/forecast/hourly-classify] DB query error:', dbError.message);
            }
            
            if (dbPredictions && dbPredictions.length >= 30) {
                // Use pre-computed predictions from DB
                forecastRows = dbPredictions.map((row: any) => ({
                    target_at: row.target_at,
                    pm25: Number(row.pm25_pred) || 0,
                    pm10: Number(row.pm10_pred) || 0,
                    co: Number(row.co_pred) || 0,
                }));
                method = "XGBoost Hybrid (Pre-computed)";
                source = "database";
            } else {
                console.log('[/api/forecast/hourly-classify] No recent DB predictions, using fallback');
            }
        } catch (dbErr: any) {
            console.error('[/api/forecast/hourly-classify] DB fetch error:', dbErr.message);
        }
        
        // Step 2: If no DB data, compute simple fallback prediction
        if (forecastRows.length < 30) {
            const { data: rows } = await supabase
                .from('tb_konsentrasi_gas')
                .select('pm25_ugm3, pm10_ugm3, co_ugm3')
                .order('created_at', { ascending: false })
                .limit(60);
            
            if (rows && rows.length > 0) {
                // Calculate average for base prediction
                const pm25Values = rows.map(r => Number(r.pm25_ugm3) || 0).filter(v => v > 0);
                const pm10Values = rows.map(r => Number(r.pm10_ugm3) || 0).filter(v => v > 0);
                const coValues = rows.map(r => Number(r.co_ugm3) || 0).filter(v => v > 0);
                
                const basePm25 = pm25Values.length > 0 ? pm25Values.reduce((a, b) => a + b, 0) / pm25Values.length : 10;
                const basePm10 = pm10Values.length > 0 ? pm10Values.reduce((a, b) => a + b, 0) / pm10Values.length : 20;
                const baseCo = coValues.length > 0 ? coValues.reduce((a, b) => a + b, 0) / coValues.length : 500;
                
                // Simple trend calculation
                const recentPm25 = pm25Values.slice(0, Math.min(10, pm25Values.length));
                const trendPm25 = recentPm25.length >= 2 ? (recentPm25[0] - recentPm25[recentPm25.length - 1]) / recentPm25.length : 0;
                
                for (let i = 0; i < 60; i++) {
                    const dampedTrend = trendPm25 * (60 - i) * 0.3;
                    const noise = (Math.random() - 0.5) * (basePm25 * 0.1);
                    const targetAt = new Date(Date.now() + (i + 1) * 60000);
                    
                    forecastRows.push({
                        target_at: targetAt.toISOString(),
                        pm25: Math.max(0, basePm25 + dampedTrend + noise),
                        pm10: Math.max(0, basePm10 + dampedTrend * 0.5 + noise * 0.5),
                        co: Math.max(0, baseCo + dampedTrend * 10 + noise * 10),
                    });
                }
                method = "Simple Moving Average + Trend";
                source = "realtime";
            }
        }
        
        if (forecastRows.length === 0) {
            return NextResponse.json({ error: 'No forecast data available' }, { status: 400 });
        }

        // Batch classify - only PM2.5, PM10, CO
        let classifications: any[] = [];
        let classificationMethod = "ISPU Breakpoint";

        try {
            console.log('[/api/forecast/hourly-classify] Running classification...');
            const classifyInput = JSON.stringify({
                pm25: forecastRows.map(r => r.pm25),
                pm10: forecastRows.map(r => r.pm10),
                co: forecastRows.map(r => r.co),
            });

            const classifyOutput = execSync(`python "${CLASSIFY_BATCH_SCRIPT}"`, {
                timeout: 10000,
                input: classifyInput,
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.resolve(process.cwd()),
            });

            const classifyResult = JSON.parse(classifyOutput.trim());
            if (classifyResult.success && classifyResult.results) {
                classifications = classifyResult.results;
                classificationMethod = "Random Forest";
            }
        } catch (e) {
            console.error('[/api/forecast/hourly-classify] RF classification failed, using ISPU fallback:', e);
            // Fallback to ISPU Breakpoint
            classifications = forecastRows.map(row => {
                const ispu = getISPU(row.pm25, row.pm10, row.co);
                return {
                    category: ispiToLabel(ispu),
                    ispu,
                    dominant: getDominant(row.pm25, row.pm10, row.co),
                    color: CAT_COLORS[ispiToLabel(ispu)],
                    confidence: 0.95,
                };
            });
        }

        // Merge forecast with classification
        const finalResult = forecastRows.map((row, i) => {
            const cls = classifications[i] || {};
            const ispu = getISPU(row.pm25, row.pm10, row.co);

            return {
                target_at: row.target_at,
                pm25: Number(row.pm25?.toFixed(2)) || 0,
                pm10: Number(row.pm10?.toFixed(2)) || 0,
                co: Number(row.co?.toFixed(2)) || 0,
                ispu: Number(ispu.toFixed(2)),
                category: cls.category || ispiToLabel(ispu),
                dominant: cls.dominant || getDominant(row.pm25, row.pm10, row.co),
                color: cls.color || CAT_COLORS[ispiToLabel(ispu)],
                confidence: cls.confidence || 0.95,
            };
        });

        const latest = finalResult[0];

        return NextResponse.json({
            forecast_at: new Date().toISOString(),
            forecast: finalResult,
            classification: finalResult,
            metadata: {
                latestISPU: Number(latest.ispu.toFixed(2)),
                latestCategory: latest.category,
                latestDominant: latest.dominant,
                latestColor: latest.color,
                method: `${method} + ${classificationMethod}`,
                source: source,
            },
        });
    } catch (err) {
        console.error('[/api/forecast/hourly-classify]', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}