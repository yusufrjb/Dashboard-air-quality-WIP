"use client";

import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Zap, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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

        let timeoutId: NodeJS.Timeout;

        const channel = supabase
            .channel('realtime_forecast')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tb_prediksi_hourly',
                },
                () => {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        console.log('🔄 Data prediksi baru terdeteksi, memperbarui grafik...');
                        fetchForecast();
                    }, 2000);
                }
            )
            .subscribe();

        return () => {
            clearTimeout(timeoutId);
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
            {/* Header Section */}
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
                            {metadata?.method ?? 'Enhanced XGBoost'}
                        </span>{' '}
                        based on Supabase real-time data.
                    </p>
                </div>
            </div>

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
                <div className="space-y-8">
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
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey={(d) => d.isHistorical ? d.pm25 : null} stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHistoricalPM25)" name="Aktual PM2.5" connectNulls />
                                    <Area type="monotone" dataKey={(d) => !d.isHistorical ? d.pm25 : null} stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorForecastPM25)" name="Prediksi PM2.5" connectNulls />
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
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey={(d) => d.isHistorical ? d.pm10 : null} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorHistoricalPM10)" name="Aktual PM10" connectNulls />
                                    <Area type="monotone" dataKey={(d) => !d.isHistorical ? d.pm10 : null} stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorForecastPM10)" name="Prediksi PM10" connectNulls />
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
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey={(d) => d.isHistorical ? d.co : null} stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorHistoricalCO)" name="Aktual CO" connectNulls />
                                    <Area type="monotone" dataKey={(d) => !d.isHistorical ? d.co : null} stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorForecastCO)" name="Prediksi CO" connectNulls />
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
        </div>
    );
}