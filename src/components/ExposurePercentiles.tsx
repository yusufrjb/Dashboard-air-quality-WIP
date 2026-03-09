"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

interface MonthlyStats {
    period: string; // YYYY-MM
    mean: number;
    p90: number;
    p98: number;
}

export default function ExposurePercentiles({ months = 6, refreshKey = 0 }: { months?: number, refreshKey?: number }) {
    const [data, setData] = useState<MonthlyStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/aggregates/percentiles?months=${months}`);
                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error("Percentiles load error", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [months, refreshKey]);

    // Format month
    const formatMonth = (periodStr: string) => {
        const [year, month] = periodStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    };

    const getSeverityClass = (val: number) => {
        if (val <= 50) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30";
        if (val <= 100) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30";
        if (val <= 150) return "text-orange-600 bg-orange-50 dark:bg-orange-950/30";
        return "text-red-600 bg-red-50 dark:bg-red-950/30 font-bold";
    };

    return (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm max-w-full overflow-hidden flex flex-col w-full h-full">
            <div className="mb-4 flex gap-2 items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Risiko Ekstrem (Persentil)</h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground w-full">Riwayat Paparan Bahaya Bulanan PM2.5</p>
                </div>
            </div>

            <div className="w-full overflow-x-auto rounded-lg border border-border flex-1 border-b-0">
                <table className="w-full text-xs min-w-[300px]">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Bulan</th>
                            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground" title="Rata-rata bulanan">Mean</th>
                            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground" title="Persentil 90 (10% waktu terburuk)">P90</th>
                            <th className="px-3 py-2.5 text-right font-medium text-muted-foreground flex gap-1 items-center justify-end">
                                <AlertTriangle size={12} className="text-orange-500" />
                                <span title="Persentil 98 (Risiko Pengecualian)">P98</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-muted-foreground">Memuat...</td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-muted-foreground">Belum ada cukup data.</td>
                            </tr>
                        ) : (
                            data.map((row, i) => (
                                <tr key={row.period} className={cn("transition-colors hover:bg-muted/30", i % 2 === 1 && "bg-muted/10")}>
                                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{formatMonth(row.period)}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold text-foreground opacity-80">{row.mean}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold">
                                        <span className={cn("px-1.5 py-0.5 rounded", getSeverityClass(row.p90))}>{row.p90}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold w-[75px]">
                                        <span className={cn("px-1.5 py-0.5 rounded", getSeverityClass(row.p98))}>{row.p98}</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-3 text-[10px] text-muted-foreground flex items-start gap-1.5">
                <Info size={12} className="shrink-0 mt-0.5" />
                <span>P98 menunjukkan nilai konsentrasi polusi tertinggi pada 2% waktu terburuk selama bulan berjalan.</span>
            </div>
        </div>
    );
}
