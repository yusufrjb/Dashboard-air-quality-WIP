import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Convert PM2.5 µg/m³ to ISPU
function pm25ToISPU(ugm3: number): number {
    // ISPU PM2.5 conversion based on Indonesian standards
    if (ugm3 <= 15) return Math.round((ugm3 / 15) * 50);
    if (ugm3 <= 35) return Math.round(50 + ((ugm3 - 15) / 20) * 50);
    if (ugm3 <= 55) return Math.round(100 + ((ugm3 - 35) / 20) * 100);
    if (ugm3 <= 150) return Math.round(200 + ((ugm3 - 55) / 95) * 100);
    if (ugm3 <= 250) return Math.round(300 + ((ugm3 - 150) / 100) * 100);
    return Math.round(400 + ((ugm3 - 250) / 100) * 100);
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '90');

        const since = new Date();
        since.setDate(since.getDate() - days);

        // Use air_quality_hourly_agg table
        const { data, error } = await supabase
            .from('air_quality_hourly_agg')
            .select('time, pm25_ugm3')
            .gte('time', since.toISOString())
            .order('time', { ascending: true });

        if (error) throw error;

        const rows = data || [];
        console.log('Hourly agg data:', {
            totalRows: rows.length,
            dateRange: { from: since.toISOString(), to: new Date().toISOString() }
        });

        // Group by day (Asia/Jakarta timezone)
        const dailyData: Record<string, {
            date: string;
            dayOfWeek: number;
            isWeekend: boolean;
            hours: Set<number>;
            values: number[];
            count: number;
        }> = {};
        
        for (const row of rows) {
            if (!row.time || row.pm25_ugm3 == null) continue;
            
            const date = new Date(row.time);
            const dateInJakarta = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            
            const year = dateInJakarta.getFullYear();
            const month = String(dateInJakarta.getMonth() + 1).padStart(2, '0');
            const day = String(dateInJakarta.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const dayOfWeek = dateInJakarta.getDay();
            const hour = dateInJakarta.getHours();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Convert µg/m³ to ISPU for consistency with card parameters
            const ispuValue = pm25ToISPU(row.pm25_ugm3);
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: dateStr,
                    dayOfWeek,
                    isWeekend,
                    hours: new Set(),
                    values: [],
                    count: 0
                };
            }
            
            dailyData[dateStr].hours.add(hour);
            dailyData[dateStr].values.push(ispuValue);
            dailyData[dateStr].count++;
        }
        
        const dailyArray = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
        
        const weekdays = dailyArray.filter(d => !d.isWeekend);
        const weekends = dailyArray.filter(d => d.isWeekend);
        
        console.log('Daily Data Summary:', {
            totalDays: dailyArray.length,
            weekdays: weekdays.length,
            weekends: weekends.length,
            weekdaysWithFull24Hours: weekdays.filter(d => d.hours.size === 24).length,
            weekendsWithFull24Hours: weekends.filter(d => d.hours.size === 24).length
        });
        
        // Calculate hourly averages using daily data
        const hourlyAverages = Array.from({ length: 24 }, (_, hour) => {
            const weekdayValues: number[] = [];
            const weekendValues: number[] = [];
            
            weekdays.forEach(day => {
                if (day.hours.has(hour)) {
                    const avg = day.values.reduce((a, b) => a + b, 0) / day.values.length;
                    weekdayValues.push(avg);
                }
            });
            
            weekends.forEach(day => {
                if (day.hours.has(hour)) {
                    const avg = day.values.reduce((a, b) => a + b, 0) / day.values.length;
                    weekendValues.push(avg);
                }
            });
            
            const wDayAvg = weekdayValues.length > 0
                ? weekdayValues.reduce((a, b) => a + b, 0) / weekdayValues.length
                : 0;
            
            const wEndAvg = weekendValues.length > 0
                ? weekendValues.reduce((a, b) => a + b, 0) / weekendValues.length
                : 0;
            
            return {
                hour,
                label: `${String(hour).padStart(2, "0")}:00`,
                weekday_avg: Number(wDayAvg.toFixed(2)),
                weekend_avg: Number(wEndAvg.toFixed(2))
            };
        });

        const weekendDataPoints = weekends.reduce((sum, d) => sum + d.count, 0);
        const weekdayDataPoints = weekdays.reduce((sum, d) => sum + d.count, 0);
        const weekendHoursWithData = hourlyAverages.filter(h => h.weekend_avg > 0).length;
        const weekdayHoursWithData = hourlyAverages.filter(h => h.weekday_avg > 0).length;
        
        console.log('Hourly Pattern Data Summary:', {
            totalRows: rows.length,
            weekendDataPoints,
            weekdayDataPoints,
            weekendHoursWithData,
            weekdayHoursWithData,
            dateRange: { from: since.toISOString(), to: new Date().toISOString() }
        });

        return NextResponse.json({
            data: hourlyAverages,
            meta: {
                hasWeekendData: weekendDataPoints > 0,
                weekendDataPoints,
                weekdayDataPoints,
                weekendHoursWithData,
                weekdayHoursWithData,
                totalWeekendDays: weekends.length,
                totalWeekdayDays: weekdays.length,
                dateRange: {
                    from: since.toISOString(),
                    to: new Date().toISOString()
                }
            }
        });
    } catch (error) {
        console.error("Error generating hourly pattern:", error);
        return NextResponse.json({ error: "Failed to generate pattern" }, { status: 500 });
    }
}
