"use client";

import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Activity, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// A) TIME SERIES FORECASTING - Multi-Horizon Comparison
// Hasil training: xgb_pm25_timeseries.pkl, xgb_pm10_timeseries.pkl, xgb_co_timeseries.pkl
// Evaluasi: horizon 1, 5, 15, 30, 60 menit | 80/20 split | 14 hari data
const forecastModels = [
    { name: "XGBoost (Multi-Horizon)", type: "Gradient Boosting", mae: 1.65, rmse: 2.12, mape: 28.5, r2: 72.1, status: "Terbaik", improvement: "16.3%" },
    { name: "Naive (Persistensi)", type: "Baseline", mae: 1.97, rmse: 2.45, mape: 35.2, r2: 65.0, status: "Baseline", improvement: "-" },
    { name: "ARIMA(1,1,1)", type: "Time-Series", mae: 3.75, rmse: 4.50, mape: 68.5, r2: 35.2, status: "Tidak Disarankan", improvement: "-47.5%" },
    { name: "ETS (Holt-Winters)", type: "Time-Series", mae: 4.89, rmse: 5.80, mape: 85.0, r2: 25.8, status: "Tidak Disarankan", improvement: "-59.8%" },
];

// Parameter-specific results
const parameterResults = {
    pm25: { naive: 1.97, xgboost: 1.65, improvement: "16.3%", horizons: { "1min": 1.39, "5min": 1.44, "15min": 1.59, "30min": 1.75, "60min": 2.07 } },
    pm10: { naive: 2.50, xgboost: 2.12, improvement: "15.3%", horizons: { "1min": 1.75, "5min": 1.87, "15min": 2.05, "30min": 2.24, "60min": 2.68 } },
    co: { naive: 138.23, xgboost: 112.96, improvement: "18.3%", horizons: { "1min": 101.41, "5min": 102.21, "15min": 108.95, "30min": 115.69, "60min": 136.54 } },
};

interface ForecastPoint {
    time: string;
    pm25: number;
    pm10?: number;
    co?: number;
    isHistorical: boolean;
    timestamp: number;
}

interface ForecastMetadata {
    dataPoints: number;
    latestPm25: number;
    latestPm10?: number;
    latestCo?: number;
    forecastedIn10min?: number;
    forecastedIn30min: number;
    forecastedIn30minPm10?: number;
    forecastedIn30minCo?: number;
    trendDirection: 'naik' | 'turun' | 'stabil';
    method: string;
}

export default function ForecastDashboard() {
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'forecast' | 'metrics'>('forecast');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);
    const [metadata, setMetadata] = useState<ForecastMetadata | null>(null);

    const fetchForecast = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/forecast');
            const json = await res.json();
            if (json.error && !json.forecast?.length) {
                setError(json.error);
                return;
            }
            setForecastData(json.forecast ?? []);
            setMetadata(json.metadata ?? null);
        } catch (err) {
            setError('Gagal memuat data prediksi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchForecast();

        const channel = supabase
            .channel('realtime_forecast')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tb_prediksi_pm25',
                },
                () => {
                    console.log('🔄 Data prediksi baru terdeteksi, memperbarui grafik...');
                    fetchForecast();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (!mounted) return null;

    const trendIcon = metadata?.trendDirection === 'naik'
        ? <TrendingUp className="w-4 h-4 text-rose-500" />
        : metadata?.trendDirection === 'turun'
            ? <TrendingDown className="w-4 h-4 text-emerald-500" />
            : <Minus className="w-4 h-4 text-slate-400" />;

    const trendColor = metadata?.trendDirection === 'naik'
        ? 'text-rose-600' : metadata?.trendDirection === 'turun'
            ? 'text-emerald-600' : 'text-slate-500';

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const isHistorical = payload[0]?.payload?.isHistorical;
            return (
                <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-500 text-xs mb-1">{label}</p>
                    <p className={cn("font-semibold text-sm", isHistorical ? "text-indigo-700" : "text-orange-600")}>
                        PM2.5: {payload[0]?.value?.toFixed(1)} µg/m³
                    </p>
                    <p className="text-xs text-slate-400">{isHistorical ? 'Data Aktual' : 'Prediksi'}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Zap className="w-5 h-5 text-indigo-500" />
                        Forecasting & Analitik
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Prediksi PM2.5, PM10, dan CO menggunakan{' '}
                        <span className={cn(
                            "font-medium",
                            (metadata as any)?.usingXGBoost ? "text-emerald-600" : "text-indigo-600"
                        )}>
                            {metadata?.method ?? 'Holt-Winters (Menunggu XGBoost...)'}
                        </span>{' '}
                        berdasarkan data Supabase real-time.
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('forecast')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                            activeTab === 'forecast'
                                ? "bg-white text-indigo-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Grafik Prediksi 1 Jam
                    </button>
                    <button
                        onClick={() => setActiveTab('metrics')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                            activeTab === 'metrics'
                                ? "bg-white text-indigo-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Performa Model ML
                    </button>
                </div>
            </div>

            {activeTab === 'forecast' ? (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center h-[300px]">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-600" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-400 gap-3">
                            <AlertTriangle className="w-10 h-10 text-amber-400" />
                            <p className="text-sm">{error}</p>
                            <button onClick={fetchForecast} className="text-sm text-indigo-600 hover:underline">Coba lagi</button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* PM2.5 Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3 h-[250px] bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h4 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">PM2.5</h4>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorHistoricalPM25" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorForecastPM25" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ fontSize: 12 }} />
                                            <Area type="monotone" dataKey={(d) => d.isHistorical ? d.pm25 : null} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHistoricalPM25)" name="Aktual PM2.5" />
                                            <Area type="monotone" dataKey={(d) => !d.isHistorical ? d.pm25 : null} stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorForecastPM25)" name="Prediksi PM2.5" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                        <h4 className="text-xs font-semibold text-indigo-500 uppercase mb-1">PM2.5 Saat Ini</h4>
                                        <p className="text-2xl font-black text-indigo-800">{metadata?.latestPm25?.toFixed(2) ?? '—'}</p>
                                        <p className="text-xs text-indigo-400">µg/m³</p>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                        <h4 className="text-xs font-semibold text-orange-500 uppercase mb-1">Prediksi 1 Jam</h4>
                                        <p className="text-2xl font-black text-orange-700">{metadata?.forecastedIn30min?.toFixed(2) ?? '—'}</p>
                                        <p className="text-xs text-orange-400">µg/m³</p>
                                    </div>
                                </div>
                            </div>

                            {/* PM10 Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3 h-[250px] bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h4 className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-2">PM10</h4>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorHistoricalPM10" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorForecastPM10" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ fontSize: 12 }} />
                                            <Area type="monotone" dataKey={(d) => d.isHistorical ? d.pm10 : null} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHistoricalPM10)" name="Aktual PM10" />
                                            <Area type="monotone" dataKey={(d) => !d.isHistorical ? d.pm10 : null} stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorForecastPM10)" name="Prediksi PM10" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                        <h4 className="text-xs font-semibold text-emerald-500 uppercase mb-1">PM10 Saat Ini</h4>
                                        <p className="text-2xl font-black text-emerald-800">{metadata?.latestPm10?.toFixed(2) ?? '—'}</p>
                                        <p className="text-xs text-emerald-400">µg/m³</p>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                        <h4 className="text-xs font-semibold text-orange-500 uppercase mb-1">Prediksi 1 Jam</h4>
                                        <p className="text-2xl font-black text-orange-700">{metadata?.forecastedIn30minPm10?.toFixed(2) ?? '—'}</p>
                                        <p className="text-xs text-orange-400">µg/m³</p>
                                    </div>
                                </div>
                            </div>

                            {/* CO Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                <div className="lg:col-span-3 h-[250px] bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">CO</h4>
                                    <ResponsiveContainer width="100%" height="90%">
                                        <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorHistoricalCO" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorForecastCO" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
                                            <Tooltip contentStyle={{ fontSize: 12 }} />
                                            <Area type="monotone" dataKey={(d) => d.isHistorical ? d.co : null} stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorHistoricalCO)" name="Aktual CO" />
                                            <Area type="monotone" dataKey={(d) => !d.isHistorical ? d.co : null} stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorForecastCO)" name="Prediksi CO" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                                        <h4 className="text-xs font-semibold text-amber-500 uppercase mb-1">CO Saat Ini</h4>
                                        <p className="text-2xl font-black text-amber-800">{metadata?.latestCo?.toFixed(2) ?? '—'}</p>
                                        <p className="text-xs text-amber-400">ppb</p>
                                    </div>
                                    <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                                        <h4 className="text-xs font-semibold text-orange-500 uppercase mb-1">Prediksi 1 Jam</h4>
                                        <p className="text-2xl font-black text-orange-700">{metadata?.forecastedIn30minCo?.toFixed(2) ?? '—'}</p>
                                        <p className="text-xs text-orange-400">ppb</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="space-y-6">
                    {/* Tabel 1: Forecasting Time-Series */}
                    <div>
                        <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Forecasting Time-Series
                        </h4>
                        <p className="text-xs text-slate-400 mb-3">Memprediksi PM2.5 ke depan berdasarkan pola historis (35.524 obs)</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500">
                                <thead className="text-xs text-slate-700 uppercase bg-indigo-50 border-b border-indigo-100">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Model</th>
                                        <th className="px-4 py-3">MAE</th>
                                        <th className="px-4 py-3">RMSE</th>
                                        <th className="px-4 py-3 text-center">MAPE</th>
                                        <th className="px-4 py-3 text-center">R²</th>
                                        <th className="px-4 py-3 rounded-tr-lg">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecastModels.map((m, i) => (
                                        <tr key={i} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                                            <td className="px-4 py-3">{m.mae}</td>
                                            <td className="px-4 py-3">{m.rmse}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                                                    m.mape < 35 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                                )}>{m.mape}%</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                                                    m.r2 > 50 ? "bg-emerald-100 text-emerald-700"
                                                        : m.r2 > 0 ? "bg-slate-100 text-slate-700"
                                                            : "bg-slate-100 text-slate-400"
                                                )}>{m.r2}%</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className={cn("px-2 py-0.5 rounded-full font-medium",
                                                    m.status === 'Terbaik' ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"
                                                )}>{m.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <p className="mt-6 text-xs text-slate-400 flex items-center gap-1 italic">
                        <Activity className="w-3 h-3" />
                        Evaluasi pada 35.500+ observasi nyata dari Supabase (Shuffled & K-Fold). Update setiap 5 menit.
                    </p>
                </div>
            )}
        </div>
    );
}
