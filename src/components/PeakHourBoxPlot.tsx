"use client";

import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";

interface BoxPlotStats {
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    outliers: number[];
}

export default function PeakHourDistribution({ days = 30, refreshKey = 0 }: { days?: number, refreshKey?: number }) {
    const [stats, setStats] = useState<BoxPlotStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/aggregates/peak-hour-distribution?days=${days}`);
                if (!res.ok) throw new Error("Gagal mengambil data distribusi");
                const data = await res.json();
                setStats(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [days, refreshKey]);

    if (loading) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-card p-5 animate-pulse">
                <p className="text-sm font-medium text-muted-foreground">Menghitung Data Statistik...</p>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex h-40 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-5">
                <p className="text-sm font-medium text-red-600">Gagal memuat distribusi: {error}</p>
            </div>
        );
    }

    // Calculate scales for the SVG
    const absMax = Math.max(stats.max, ...stats.outliers, 150); // Minimum scale of 150 for reference
    const PADDING = 20;

    // Helpers to position elements in SVG width (0 to 100%)
    const getX = (val: number) => `${(val / absMax) * 100}%`;

    return (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm max-w-full overflow-hidden flex flex-col w-full h-full">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Distribusi PM2.5 (Jam Sibuk)</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Rentang 07:00 - 09:00 WIB (Senin - Jumat) selama 30 Hari Terakhir
                </p>
            </div>

            <div className="flex-1 flex flex-col justify-center min-h-[120px] relative mt-2 pt-6 pb-8 px-2">
                {/* SVG Canvas */}
                <div className="relative w-full h-24 mt-2 border-b border-border/50">
                    {/* Grid markings */}
                    <div className="absolute top-0 bottom-0 left-[20%] border-l border-dashed border-border/60 pointer-events-none" />
                    <div className="absolute top-0 bottom-0 left-[40%] border-l border-dashed border-border/60 pointer-events-none" />
                    <div className="absolute top-0 bottom-0 left-[60%] border-l border-dashed border-border/60 pointer-events-none" />
                    <div className="absolute top-0 bottom-0 left-[80%] border-l border-dashed border-border/60 pointer-events-none" />

                    {/* WHO Guide line */}
                    <div
                        className="absolute top-0 bottom-0 border-l border-dashed border-emerald-500 z-0"
                        style={{ left: getX(15) }}
                    />
                    <span
                        className="absolute -top-5 text-[10px] font-semibold text-emerald-600 whitespace-nowrap"
                        style={{ left: `calc(${getX(15)} - 10px)` }}
                    >
                        WHO (15)
                    </span>

                    {/* Primary SVG Box Plot */}
                    {stats.q3 > 0 && (
                        <svg className="absolute inset-0 w-full h-full overflow-visible z-10">
                            {/* Whiskers (Lines from min to Q1 and Q3 to max) */}
                            <line x1={getX(stats.min)} y1="50%" x2={getX(stats.q1)} y2="50%" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" strokeDasharray="3,3" />
                            <line x1={getX(stats.q3)} y1="50%" x2={getX(stats.max)} y2="50%" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" strokeDasharray="3,3" />

                            {/* Whisker Caps */}
                            <line x1={getX(stats.min)} y1="35%" x2={getX(stats.min)} y2="65%" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" />
                            <line x1={getX(stats.max)} y1="35%" x2={getX(stats.max)} y2="65%" stroke="currentColor" className="text-muted-foreground" strokeWidth="2" />

                            {/* IQR Box (Q1 to Q3) */}
                            <rect
                                x={getX(stats.q1)}
                                y="25%"
                                width={`calc(${getX(stats.q3)} - ${getX(stats.q1)})`}
                                height="50%"
                                className="fill-blue-500/20 stroke-blue-600 dark:stroke-blue-400 stroke-2"
                                rx="4"
                            />

                            {/* Median Line */}
                            <line x1={getX(stats.median)} y1="25%" x2={getX(stats.median)} y2="75%" stroke="currentColor" className="text-blue-700 dark:text-blue-300" strokeWidth="3" />

                            {/* Outliers */}
                            {stats.outliers.map((val, idx) => (
                                <circle
                                    key={idx}
                                    cx={getX(val)}
                                    cy="50%"
                                    r="3.5"
                                    className="fill-red-500 stroke-white dark:stroke-black stroke-1 opacity-75"
                                />
                            ))}

                            {/* Data Labels */}
                            <text x={getX(stats.median)} y="90%" fill="currentColor" fontSize="10" textAnchor="middle" className="text-foreground font-semibold">
                                {stats.median}
                            </text>
                            <text x={getX(stats.q3)} y="15%" fill="currentColor" fontSize="9" textAnchor="start" dx="3" className="text-muted-foreground">
                                Q3: {stats.q3}
                            </text>
                            <text x={getX(stats.q1)} y="15%" fill="currentColor" fontSize="9" textAnchor="end" dx="-3" className="text-muted-foreground">
                                {stats.q1} :Q1
                            </text>
                        </svg>
                    )}
                </div>

                {/* Scale labels */}
                <div className="flex justify-between w-full text-[9px] text-muted-foreground mt-3 font-medium">
                    <span>0</span>
                    <span>{Math.round(absMax * 0.2)}</span>
                    <span>{Math.round(absMax * 0.4)}</span>
                    <span>{Math.round(absMax * 0.6)}</span>
                    <span>{Math.round(absMax * 0.8)}</span>
                    <span>{Math.round(absMax)} µg/m³</span>
                </div>
            </div>

            <div className="mt-auto px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex gap-2 items-start mt-4">
                <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
                    Visualisasi <strong>Box Plot</strong> menampilkan dimana rerata aktivitas PM2.5 sebenarnya berkumpul. Kotak biru berisi 50% data yang biasa terjadi. Titik merah mewakili anomali ekstrem yang perlu diwaspadai di perjalanan pagi.
                </p>
            </div>
        </div>
    );
}
