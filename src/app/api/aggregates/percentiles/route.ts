import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to calculate percentiles
function percentile(arr: number[], p: number) {
    if (arr.length === 0) return 0;
    if (p <= 0) return arr[0];
    if (p >= 100) return arr[arr.length - 1];
    const index = (arr.length - 1) * p / 100;
    const lower = Math.floor(index);
    const upper = lower + 1;
    const weight = index - lower;
    if (upper >= arr.length) return arr[lower];
    return arr[lower] * (1 - weight) + arr[upper] * weight;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const months = parseInt(searchParams.get('months') || '6');

        const since = new Date();
        since.setMonth(since.getMonth() - months);
        // Start from beginning of the month for clean grouping
        since.setDate(1);
        since.setHours(0, 0, 0, 0);

        // Fetch from hourly aggregates for efficiency instead of raw data for 6 months
        const { data, error } = await supabase
            .from('air_quality_hourly_agg')
            .select('timestamp, pm25')
            .gte('timestamp', since.toISOString())
            .order('timestamp', { ascending: false })
            .limit(100000); // 100k limits over a year of hourly data

        let rows = data || [];

        // Fallback to raw data if needed
        if (error || !data || data.length === 0) {
            const raw = await supabase
                .from('tb_konsentrasi_gas')
                .select('created_at, pm25_ugm3')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })
                .limit(100000);

            if (raw.error) throw raw.error;
            rows = (raw.data || []).map(r => ({
                timestamp: r.created_at,
                pm25: r.pm25_ugm3
            }));
        }

        const monthlyGroups: Record<string, number[]> = {};

        for (const row of rows) {
            if (!row.timestamp || row.pm25 == null) continue;

            const date = new Date(row.timestamp);
            if (isNaN(date.getTime())) continue;

            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            if (!monthlyGroups[period]) monthlyGroups[period] = [];
            monthlyGroups[period].push(row.pm25);
        }

        const result = Object.entries(monthlyGroups).map(([period, values]) => {
            values.sort((a, b) => a - b);

            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const p90 = percentile(values, 90);
            const p98 = percentile(values, 98);

            return {
                period,
                mean: Number(mean.toFixed(1)),
                p90: Number(p90.toFixed(1)),
                p98: Number(p98.toFixed(1))
            };
        });

        // Sort by period descending (latest month first)
        result.sort((a, b) => b.period.localeCompare(a.period));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error generating percentile stats:", error);
        return NextResponse.json({ error: "Failed to generate stats" }, { status: 500 });
    }
}
