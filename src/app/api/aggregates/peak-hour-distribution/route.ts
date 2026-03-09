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
        const days = parseInt(searchParams.get('days') || '30');

        const since = new Date();
        since.setDate(since.getDate() - days);

        // Fetch raw data because we need all points for distribution
        const { data, error } = await supabase
            .from('tb_konsentrasi_gas')
            .select('created_at, pm25_ugm3')
            .gte('created_at', since.toISOString())
            .limit(100000); // Need enough limit to cover days

        if (error) throw error;

        const rows = data || [];
        const peakHourValues: number[] = [];

        // Filter: Weekdays (1-5) & Peak Hours (07:00 - 08:59)
        for (const row of rows) {
            if (!row.created_at || row.pm25_ugm3 == null) continue;

            const date = new Date(row.created_at);
            const hour = date.getHours();
            const day = date.getDay(); // 0 is Sunday, 6 is Saturday

            if (isNaN(hour) || isNaN(day)) continue;

            const isWeekday = day >= 1 && day <= 5;
            if (isWeekday && hour >= 7 && hour < 9) {
                peakHourValues.push(row.pm25_ugm3);
            }
        }

        peakHourValues.sort((a, b) => a - b);

        if (peakHourValues.length === 0) {
            return NextResponse.json({
                min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: []
            });
        }

        const q1 = percentile(peakHourValues, 25);
        const median = percentile(peakHourValues, 50);
        const q3 = percentile(peakHourValues, 75);
        const iqr = q3 - q1;

        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        const normalValues = peakHourValues.filter(v => v >= lowerBound && v <= upperBound);
        const outliers = peakHourValues.filter(v => v < lowerBound || v > upperBound);

        const min = normalValues.length > 0 ? normalValues[0] : q1;
        const max = normalValues.length > 0 ? normalValues[normalValues.length - 1] : q3;

        return NextResponse.json({
            min: Number(min.toFixed(2)),
            q1: Number(q1.toFixed(2)),
            median: Number(median.toFixed(2)),
            q3: Number(q3.toFixed(2)),
            max: Number(max.toFixed(2)),
            outliers: outliers.map(v => Number(v.toFixed(2)))
        });
    } catch (error) {
        console.error("Error generating peak hour distribution:", error);
        return NextResponse.json({ error: "Failed to generate distribution" }, { status: 500 });
    }
}
