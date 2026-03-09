import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');

        const since = new Date();
        since.setDate(since.getDate() - days);

        // Try getting from hourly_agg first for efficiency
        let { data, error } = await supabase
            .from('air_quality_hourly_agg')
            .select('timestamp, pm25')
            .gte('timestamp', since.toISOString())
            .limit(10000);

        let rows = data || [];

        if (error || !data || data.length === 0) {
            // Fallback to raw data if hourly_agg is empty
            const raw = await supabase
                .from('tb_konsentrasi_gas')
                .select('created_at, pm25_ugm3')
                .gte('created_at', since.toISOString())
                .limit(50000);

            if (raw.error) throw raw.error;
            rows = (raw.data || []).map(r => ({
                timestamp: r.created_at,
                pm25: r.pm25_ugm3
            }));
        }

        const hourlyAverages = Array.from({ length: 24 }, (_, hour) => {
            return {
                hour,
                label: `${String(hour).padStart(2, "0")}:00`,
                weekday_pm25: [] as number[],
                weekend_pm25: [] as number[],
            };
        });

        // Bucket the data
        for (const row of rows) {
            if (!row.timestamp || row.pm25 == null) continue;

            const date = new Date(row.timestamp);
            const hour = date.getHours();
            const day = date.getDay(); // 0 is Sunday, 6 is Saturday

            if (isNaN(hour) || isNaN(day)) continue;

            const isWeekend = day === 0 || day === 6;
            if (isWeekend) {
                hourlyAverages[hour].weekend_pm25.push(row.pm25);
            } else {
                hourlyAverages[hour].weekday_pm25.push(row.pm25);
            }
        }

        // Calculate averages
        const result = hourlyAverages.map(bucket => {
            const wDayAvg = bucket.weekday_pm25.length > 0
                ? bucket.weekday_pm25.reduce((a, b) => a + b, 0) / bucket.weekday_pm25.length
                : 0;

            const wEndAvg = bucket.weekend_pm25.length > 0
                ? bucket.weekend_pm25.reduce((a, b) => a + b, 0) / bucket.weekend_pm25.length
                : 0;

            return {
                hour: bucket.hour,
                label: bucket.label,
                weekday_avg: Number(wDayAvg.toFixed(2)),
                weekend_avg: Number(wEndAvg.toFixed(2))
            };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error generating hourly pattern:", error);
        return NextResponse.json({ error: "Failed to generate pattern" }, { status: 500 });
    }
}
