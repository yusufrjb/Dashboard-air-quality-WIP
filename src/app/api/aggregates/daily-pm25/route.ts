import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

        // Target start and end dates based on user parameters
        const startDate = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        let { data, error } = await supabase
            .from('air_quality_daily_agg')
            .select('date, pm25')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(31);

        if (!error && data && data.length > 0) {
            const result = data.map(r => ({
                date: r.date,
                avg_pm25: Number(r.pm25)
            }));
            return NextResponse.json(result);
        }

        // Fallback: If no strict daily_agg table match, use raw data or hourly_agg
        const raw = await supabase
            .from('tb_konsentrasi_gas')
            .select('created_at, pm25_ugm3')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .limit(50000);

        if (raw.error) throw raw.error;

        // Aggregate by day manually
        const daysMap: Record<string, number[]> = {};
        (raw.data || []).forEach(r => {
            if (!r.created_at || r.pm25_ugm3 == null) return;

            // Ensure proper timezone handling or simple slicing
            const d = new Date(r.created_at);
            // Correctly format to local YYYY-MM-DD for grouping
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dayLine = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${dayLine}`;

            if (!daysMap[dateStr]) daysMap[dateStr] = [];
            daysMap[dateStr].push(r.pm25_ugm3);
        });

        const result = Object.keys(daysMap).map(k => {
            const arr = daysMap[k];
            const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
            return {
                date: k,
                avg_pm25: Number(avg.toFixed(2))
            };
        }).sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error generating daily heatmap data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
