'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Wind, Clock, TrendingUp, Loader2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const BP_PM25 = [[0,15,0,50],[15,35,50,100],[35,55,100,200],[55,150,200,300],[150,250,300,400],[250,350,400,500]];
const BP_PM10 = [[0,50,0,50],[50,150,50,100],[150,350,100,200],[350,420,200,300],[420,500,300,400],[500,600,400,500]];
const BP_CO = [[0,5000,0,50],[5000,10000,50,100],[10000,17000,100,200],[17000,34000,200,300],[34000,46000,300,400],[46000,56000,400,500]];

function concToISPI(val: number, bp: number[][]): number {
    if (val <= 0) return 0;
    for (const [cl, ch, il, ih] of bp) {
        if (val <= ch) return il + (val - cl) / (ch - cl) * (ih - il);
    }
    return bp[bp.length - 1][3];
}

interface ForecastRow {
    target_at: string;
    pm25: number;
    pm10: number;
    co: number;
    ispu: number;
    category: string;
    dominant: string;
    color: string;
}

interface HourlyData {
    forecast_at: string;
    forecast: ForecastRow[];
    classification: ForecastRow[];
    metadata: {
        latestISPU: number;
        latestCategory: string;
        latestDominant: string;
        latestColor: string;
        method: string;
    };
}

const CAT_COLORS: Record<string, string> = {
    "Baik": "#10b981",
    "Sedang": "#3b82f6",
    "Tidak Sehat": "#f59e0b",
    "Sangat Tidak Sehat": "#ef4444",
    "Berbahaya": "#7c3aed",
};

export default function HourlyForecastClassification() {
    const [data, setData] = useState<HourlyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

    useEffect(() => {
        const fetchData = () => {
            fetch('/api/forecast/hourly-classify')
                .then(res => res.json())
                .then(d => { setData(d); setLoading(false); })
                .catch(() => setLoading(false));
        };

        fetchData();
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Memuat prediksi 1 jam...
                </div>
            </div>
        );
    }

    if (!data || !data.forecast) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <p className="text-slate-400 text-center py-8">Belum ada data prediksi.</p>
            </div>
        );
    }

    const chartData = data.forecast.map((f, i) => {
        const pm25ISPU = BP_PM25.findIndex(([cl, ch]) => f.pm25 <= ch) !== -1 
            ? concToISPI(f.pm25, BP_PM25) : 0;
        const pm10ISPU = BP_PM10.findIndex(([cl, ch]) => f.pm10 <= ch) !== -1 
            ? concToISPI(f.pm10, BP_PM10) : 0;
        const coISPU = BP_CO.findIndex(([cl, ch]) => f.co <= ch) !== -1 
            ? concToISPI(f.co, BP_CO) : 0;

        return {
            time: new Date(f.target_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }),
            PM25: Math.round(pm25ISPU * 100) / 100,
            PM10: Math.round(pm10ISPU * 100) / 100,
            CO: Math.round(coISPU * 100) / 100,
            ISPU: Math.round(f.ispu * 100) / 100,
        };
    });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Prediksi 1 Jam (ISPU)</h3>
                        <p className="text-xs text-slate-400">PM2.5, PM10, CO dengan Random Forest</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                        <button
                            onClick={() => setActiveTab('chart')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium",
                                activeTab === "chart" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Grafik
                        </button>
                        <button
                            onClick={() => setActiveTab('table')}
                            className={cn(
                                "px-3 py-1 text-xs font-medium",
                                activeTab === "table" ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-slate-50"
                            )}
                        >
                            Tabel
                        </button>
                    </div>
                </div>
            </div>

            {/* Current Status Card - shows 60min ahead prediction */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex flex-col items-center justify-center rounded-lg px-4 py-2 text-white"
                    style={{ backgroundColor: data.forecast[59]?.color || data.metadata.latestColor }}
                >
                    <span className="text-lg font-bold">{data.forecast[59]?.category || data.metadata.latestCategory}</span>
                    <span className="text-xs opacity-70">ISPU {data.forecast[59]?.ispu?.toFixed(1) || data.metadata.latestISPU}</span>
                </div>
                <div className="flex-1">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                            <span className="text-slate-400 block">ISPU PM2.5</span>
                            <span className="font-semibold">{(concToISPI(data.forecast[59]?.pm25 || 0, BP_PM25)).toFixed(1)}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">ISPU PM10</span>
                            <span className="font-semibold">{(concToISPI(data.forecast[59]?.pm10 || 0, BP_PM10)).toFixed(1)}</span>
                        </div>
                        <div>
                            <span className="text-slate-400 block">ISPU CO</span>
                            <span className="font-semibold">{(concToISPI(data.forecast[59]?.co || 0, BP_CO)).toFixed(1)}</span>
                        </div>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">
                        Dominan: <span className="font-semibold">{data.forecast[59]?.dominant || data.metadata.latestDominant}</span> | 
                        Method: <span className="font-semibold">{data.metadata.method}</span>
                    </div>
                </div>
            </div>

            {/* Chart or Table */}
            {activeTab === 'chart' ? (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#94a3b8" label={{ value: 'ISPU', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8 }}
                            labelFormatter={(label) => `Waktu: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area yAxisId="left" type="monotone" dataKey="PM25" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="ISPU PM2.5" />
                        <Area yAxisId="left" type="monotone" dataKey="PM10" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="ISPU PM10" />
                        <Area yAxisId="left" type="monotone" dataKey="CO" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="ISPU CO" />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-xs text-slate-500">
                        <thead className="sticky top-0 bg-slate-50">
                            <tr>
                                <th className="px-2 py-2 text-left">Waktu</th>
                                <th className="px-2 py-2 text-right">ISPU PM2.5</th>
                                <th className="px-2 py-2 text-right">ISPU PM10</th>
                                <th className="px-2 py-2 text-right">ISPU CO</th>
                                <th className="px-2 py-2 text-right">ISPU Total</th>
                                <th className="px-2 py-2 text-left">Kategori</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.forecast.map((f, i) => (
                                <tr key={i} className="border-t border-slate-100">
                                    <td className="px-2 py-1.5">
                                        <Clock className="w-3 h-3 inline mr-1" />
                                        {new Date(f.target_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                                    </td>
                                    <td className="px-2 py-1.5 text-right font-medium">{concToISPI(f.pm25, BP_PM25).toFixed(1)}</td>
                                    <td className="px-2 py-1.5 text-right font-medium">{concToISPI(f.pm10, BP_PM10).toFixed(1)}</td>
                                    <td className="px-2 py-1.5 text-right font-medium">{concToISPI(f.co, BP_CO).toFixed(1)}</td>
                                    <td className="px-2 py-1.5 text-right font-bold">{f.ispu.toFixed(2)}</td>
                                    <td className="px-2 py-1.5">
                                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{
                                            backgroundColor: f.color + '20', color: f.color
                                        }}>
                                            {f.category}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}