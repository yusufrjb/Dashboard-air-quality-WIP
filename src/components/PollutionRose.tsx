"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Compass, Wind, RefreshCw } from "lucide-react";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Tooltip
} from "recharts";
import { cn } from "@/lib/utils";

interface PollutionRoseData {
    direction: string;
    avg_pm25: number;
    frequency: number;
}

export default function PollutionRose() {
    const [data, setData] = useState<PollutionRoseData[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/aggregates/pollution-rose?days=30");
            if (!res.ok) throw new Error("Gagal mengambil data mawar polusi");
            const jsonStr = await res.json();
            setData(jsonStr);
        } catch (err) {
            console.error(err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Determine an AQI color tone for the chart stroke
    const maxPm25 = data.length > 0 ? Math.max(...data.map(d => d.avg_pm25)) : 0;
    let strokeColor = "#3b82f6"; // moderate blue
    let fillColor = "rgba(59, 130, 246, 0.4)";

    if (maxPm25 > 150) {
        strokeColor = "#ef4444"; // red
        fillColor = "rgba(239, 68, 68, 0.4)";
    } else if (maxPm25 > 50) {
        strokeColor = "#eab308"; // yellow
        fillColor = "rgba(234, 179, 8, 0.4)";
    } else if (maxPm25 > 0) {
        strokeColor = "#10b981"; // green
        fillColor = "rgba(16, 185, 129, 0.4)";
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const pData = payload[0].payload as PollutionRoseData;
            return (
                <div className="bg-white border border-border shadow-lg rounded-xl p-3 text-sm">
                    <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                        <Compass size={14} className="text-slate-500" /> Arah {pData.direction}
                    </p>
                    <p className="text-slate-600 text-xs">
                        Rata-rata PM2.5: <span className="font-semibold text-slate-900">{pData.avg_pm25} µg/m³</span>
                    </p>
                    <p className="text-slate-500 text-[10px] mt-1">Frekuensi data: {pData.frequency} kali</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Wind size={15} className="text-muted-foreground" />
                        Diagram Mawar Polusi
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Korelasi PM2.5 terhadap Arah Angin (30 Hari)</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                    <RefreshCw size={12} className={cn(loading && "animate-spin")} />
                </button>
            </div>

            <div className="flex-1 min-h-[220px] w-full flex items-center justify-center -ml-2">
                {loading ? (
                    <div className="h-6 w-6 rounded-full border-2 border-muted border-t-primary animate-spin" />
                ) : (
                    <ResponsiveContainer width="100%" height={250}>
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                            <PolarGrid stroke="#e5e7eb" />
                            <PolarAngleAxis dataKey="direction" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} />
                            <PolarRadiusAxis
                                angle={90}
                                domain={[0, 'dataMax']}
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                                axisLine={false}
                                tickFormatter={(tick) => Math.round(tick).toString()}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Radar
                                name="Rata-rata PM2.5"
                                dataKey="avg_pm25"
                                stroke={strokeColor}
                                fill={fillColor}
                                fillOpacity={0.6}
                                strokeWidth={2}
                                isAnimationActive={false}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
