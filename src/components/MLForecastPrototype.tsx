"use client";

import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { Activity, Zap, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// A) FORECASTING TIME-SERIES (comprehensive_model_search.py)
// Target: PM2.5(t+1) | Data: 35.524 obs | 80/20 split
const forecastModels = [
    { name: "LightGBM", type: "Gradient Boosting", mae: 0.81, rmse: 1.18, mape: 33.26, r2: 64.44, status: "Terbaik" },
    { name: "XGBoost", type: "Gradient Boosting", mae: 0.82, rmse: 1.19, mape: 34.12, r2: 64.16, status: "Kedua" },
    { name: "Random Forest", type: "Ensemble", mae: 0.82, rmse: 1.20, mape: 33.06, r2: 63.16, status: "Alternatif" },
    { name: "Prophet", type: "Time-Series", mae: 1.37, rmse: 1.95, mape: 50.17, r2: 2.89, status: "Tidak Disarankan" },
    { name: "ARIMAX(2,1,2)", type: "Time-Series", mae: 1.59, rmse: 2.13, mape: 62.68, r2: -15.57, status: "Tidak Disarankan" },
];
// B) REGRESI ANTAR-PARAMETER (regression_antar_parameter.py)
// Target: PM2.5 dari [suhu, kelembapan, PM10, NO2, CO] | Data: 35.514 obs
const regressionModels = [
    { name: "Random Forest", type: "Ensemble", mae: 0.16, rmse: 1.38, mape: 3.35, r2: 93.36, cvR2: 92.14, status: "Terbaik" },
    { name: "Linear Regression", type: "Linear", mae: 0.65, rmse: 1.44, mape: 14.99, r2: 92.74, cvR2: 88.23, status: "Robust" },
    { name: "XGBoost", type: "Gradient Boosting", mae: 0.18, rmse: 1.54, mape: 4.73, r2: 91.76, cvR2: 90.13, status: "Sangat Akurat" },
    { name: "Gradient Boosting", type: "Ensemble", mae: 0.19, rmse: 1.56, mape: 3.92, r2: 91.57, cvR2: 89.85, status: "Konsisten" },
    { name: "LightGBM", type: "Gradient Boosting", mae: 0.26, rmse: 1.91, mape: 4.55, r2: 87.35, cvR2: 85.02, status: "Konsisten" },
];

interface ForecastPoint {
    time: string;
    pm25: number;
    isHistorical: boolean;
    timestamp: number;
}

interface ForecastMetadata {
    dataPoints: number;
    latestPm25: number;
    forecastedIn10min?: number;
    forecastedIn30min: number;
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
    const [regressionMetrics, setRegressionMetrics] = useState<any[]>([]);
    const [regressionMetadata, setRegressionMetadata] = useState<any>(null);

    const fetchRegression = async () => {
        try {
            const res = await fetch('/api/regression');
            const json = await res.json();
            if (json.allResults) {
                // Map API results to table structure
                const mapped = json.allResults.map((r: any) => ({
                    name: r.name,
                    type: r.name === 'Random Forest' || r.name === 'Gradient Boosting' ? 'Ensemble' :
                        r.name === 'Linear Regression' ? 'Linear' : 'Boosting',
                    mae: r.MAE,
                    rmse: r.RMSE,
                    mape: r.MAPE,
                    r2: r.R2,
                    cvR2: r.CV_R2,
                    status: r.name === json.model ? 'Terbaik' :
                        r.R2 > 90 ? 'Sangat Akurat' : 'Konsisten'
                }));
                setRegressionMetrics(mapped);
                setRegressionMetadata({
                    evaluatedAt: json.evaluatedAt,
                    totalData: json.totalData,
                    bestModel: json.model
                });
            }
        } catch (err) {
            console.error('Gagal memuat metrik regresi', err);
        }
    };

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
        fetchRegression();

        // Realtime subscription for tb_prediksi_pm25
        // Memicu fetch ulang setiap kali ada data prediksi baru masuk (setiap 5 menit)
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
                    fetchRegression(); // Also refresh regression metrics
                }
            )
            .subscribe();

        // Fallback polling for regression results (since it's file-based on server)
        const interval = setInterval(() => {
            fetchRegression();
        }, 5 * 60 * 1000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
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
                        Prediksi PM2.5 menggunakan{' '}
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
                        Grafik Prediksi 30 Menit
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
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="lg:col-span-3 h-[310px] bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            tickLine={false}
                                            axisLine={false}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            tick={{ fill: '#64748b', fontSize: 11 }}
                                            tickLine={false}
                                            axisLine={false}
                                            unit=" µg"
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        {/* WHO threshold */}
                                        <ReferenceLine
                                            y={15}
                                            label={{ position: 'insideTopRight', value: 'Aman WHO', fill: '#10b981', fontSize: 10 }}
                                            stroke="#10b981"
                                            strokeDasharray="3 3"
                                        />
                                        <ReferenceLine
                                            y={55}
                                            label={{ position: 'insideTopRight', value: 'Sedang ISPU', fill: '#f59e0b', fontSize: 10 }}
                                            stroke="#f59e0b"
                                            strokeDasharray="3 3"
                                        />
                                        {/* Actual line (blue) */}
                                        <Area
                                            type="monotone"
                                            dataKey={(d) => d.isHistorical ? d.pm25 : null}
                                            stroke="#6366f1"
                                            strokeWidth={2.5}
                                            fillOpacity={1}
                                            fill="url(#colorHistorical)"
                                            dot={false}
                                            name="Aktual"
                                            animationDuration={1000}
                                        />
                                        {/* Forecast line (orange dashed) */}
                                        <Area
                                            type="monotone"
                                            dataKey={(d) => !d.isHistorical ? d.pm25 : null}
                                            stroke="#f97316"
                                            strokeWidth={2.5}
                                            strokeDasharray="5 3"
                                            fillOpacity={1}
                                            fill="url(#colorForecast)"
                                            dot={false}
                                            name="Prediksi"
                                            animationDuration={1200}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="lg:col-span-1 flex flex-col justify-between gap-4">
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <h4 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">PM2.5 Saat Ini</h4>
                                    <p className="text-3xl font-black text-indigo-800">{metadata?.latestPm25?.toFixed(1) ?? '—'}</p>
                                    <p className="text-sm text-indigo-400">µg/m³</p>
                                </div>

                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                    <h4 className="text-xs font-semibold text-orange-500 uppercase tracking-wide mb-1">Prediksi 30 Menit</h4>
                                    <p className="text-3xl font-black text-orange-700">{metadata?.forecastedIn30min?.toFixed(1) ?? '—'}</p>
                                    <p className="text-sm text-orange-400">µg/m³</p>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tren</h4>
                                    <div className="flex items-center gap-2">
                                        {trendIcon}
                                        <span className={cn("font-bold capitalize text-sm", trendColor)}>{metadata?.trendDirection}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Berbasis {metadata?.dataPoints ?? 0} titik data</p>
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

                    {/* Tabel 2: Regresi Antar-Parameter */}
                    <div className="mt-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-3">
                            <div>
                                <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide flex items-center gap-2">
                                    <GitCompareArrows className="w-4 h-4" />
                                    Regresi Antar-Parameter
                                </h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">Memprediksi PM2.5 dari suhu, kelembapan, PM10, NO₂, CO</p>
                            </div>
                            {regressionMetadata && (
                                <div className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 flex items-center gap-2">
                                    <span className="flex items-center gap-1">
                                        <Activity className="w-3 h-3 text-amber-500" />
                                        Data: <b>{regressionMetadata.totalData?.toLocaleString()} obs</b>
                                    </span>
                                    <span className="w-px h-2 bg-slate-200" />
                                    <span>
                                        Update: <b>{new Date(regressionMetadata.evaluatedAt).toLocaleString()}</b>
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-500">
                                <thead className="text-xs text-slate-700 uppercase bg-amber-50 border-b border-amber-100">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Model</th>
                                        <th className="px-4 py-3">MAE</th>
                                        <th className="px-4 py-3">RMSE</th>
                                        <th className="px-4 py-3 text-center">R² Test</th>
                                        <th className="px-4 py-3 text-center">R² CV</th>
                                        <th className="px-4 py-3 rounded-tr-lg">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(regressionMetrics.length > 0 ? regressionMetrics : regressionModels).map((m, i) => (
                                        <tr key={i} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-900">{m.name}</td>
                                            <td className="px-4 py-3">{m.mae?.toFixed(2)}</td>
                                            <td className="px-4 py-3">{m.rmse?.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                                                    m.r2 > 80 ? "bg-emerald-100 text-emerald-700"
                                                        : m.r2 > 50 ? "bg-amber-100 text-amber-700"
                                                            : "bg-slate-100 text-slate-400"
                                                )}>{m.r2?.toFixed(1)}%</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                                                    m.cvR2 > 85 ? "bg-emerald-100 text-emerald-700"
                                                        : m.cvR2 > 70 ? "bg-amber-100 text-amber-700"
                                                            : "bg-slate-100 text-slate-400"
                                                )}>{(m.cvR2 || 0).toFixed(1)}%</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <span className={cn("px-2 py-0.5 rounded-full font-medium",
                                                    m.status === 'Terbaik' ? "bg-amber-100 text-amber-700"
                                                        : "bg-slate-100 text-slate-500"
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

// Tambahkan GitCompareArrows yang mungkin belum diimport
const GitCompareArrows = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M11 18l-2-2 2-2" />
        <path d="M13 6l2 2-2 2" />
        <path d="M15 10H5l4-4" />
        <path d="M19 14H9l4 4" />
    </svg>
);
