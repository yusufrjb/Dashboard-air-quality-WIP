'use client';

import { useEffect, useState } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell, ReferenceLine
} from 'recharts';
import { Activity, BarChart3, GitCompareArrows, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScatterPoint {
    actual: number;
    predicted: number;
    time: string;
    isTrain: boolean;
}

interface TimeSeriesPoint {
    time: string;
    actual: number;
    predicted: number;
}

interface FeatureImportance {
    feature: string;
    importance: number;
    weight: number;
}

interface RegressionData {
    scatterData: ScatterPoint[];
    timeSeriesData: TimeSeriesPoint[];
    featureImportance: FeatureImportance[];
    metrics: {
        r2: number;
        mae: number;
        dataPoints: number;
        trainSize: number;
        testSize: number;
    };
    model: string;
}

const BAR_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function RegressionVisualization() {
    const [data, setData] = useState<RegressionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'scatter' | 'timeseries' | 'importance'>('scatter');

    useEffect(() => {
        const fetchData = () => {
            fetch('/api/regression')
                .then(res => res.json())
                .then(d => { setData(d); setLoading(false); })
                .catch(() => setLoading(false));
        };

        fetchData();

        // Auto-update every 5 minutes to stay in sync with watcher
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Memuat data regresi...
                </div>
            </div>
        );
    }

    if (!data || !data.scatterData) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <p className="text-slate-400 text-center py-8">Data regresi belum tersedia.</p>
            </div>
        );
    }

    const tabs = [
        { key: 'scatter' as const, label: 'Aktual vs Prediksi', icon: GitCompareArrows },
        { key: 'timeseries' as const, label: 'Perbandingan Waktu', icon: Activity },
        { key: 'importance' as const, label: 'Pengaruh Fitur', icon: BarChart3 },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <GitCompareArrows className="w-5 h-5 text-amber-500" />
                        Regresi Antar-Parameter
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Prediksi PM2.5 dari suhu, kelembapan, PM10, NO₂, CO
                        — <span className="text-amber-600 font-semibold">{data.model}</span> (R² = {data.metrics.r2}%)
                    </p>
                </div>

                {/* Metrics badges */}
                <div className="flex gap-2">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 text-center">
                        <div className="text-xs text-emerald-600 font-medium">R²</div>
                        <div className="text-lg font-bold text-emerald-700">{data.metrics.r2}%</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-center">
                        <div className="text-xs text-blue-600 font-medium">MAE</div>
                        <div className="text-lg font-bold text-blue-700">{data.metrics.mae}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 justify-center",
                            activeTab === tab.key
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Charts */}
            <div className="h-[300px]">
                {activeTab === 'scatter' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                dataKey="actual"
                                type="number"
                                name="Aktual"
                                unit=" µg/m³"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                label={{ value: 'PM2.5 Aktual (µg/m³)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }}
                            />
                            <YAxis
                                dataKey="predicted"
                                type="number"
                                name="Prediksi"
                                unit=" µg/m³"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                label={{ value: 'PM2.5 Prediksi', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                            />
                            {/* Perfect prediction line */}
                            <ReferenceLine
                                segment={[{ x: 0, y: 0 }, { x: Math.max(...data.scatterData.map(d => d.actual)), y: Math.max(...data.scatterData.map(d => d.actual)) }]}
                                stroke="#94a3b8"
                                strokeDasharray="5 5"
                                strokeWidth={1}
                            />
                            <Tooltip
                                content={({ payload }) => {
                                    if (!payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
                                            <div className="font-semibold text-slate-700 mb-1">{d.time}</div>
                                            <div>Aktual: <span className="font-bold text-indigo-600">{d.actual} µg/m³</span></div>
                                            <div>Prediksi: <span className="font-bold text-amber-600">{d.predicted} µg/m³</span></div>
                                            <div className="text-slate-400 mt-1">{d.isTrain ? 'Data Train' : 'Data Test'}</div>
                                        </div>
                                    );
                                }}
                            />
                            <Scatter
                                data={data.scatterData.filter(d => d.isTrain)}
                                fill="#6366f1"
                                fillOpacity={0.5}
                                r={3}
                                name="Train"
                            />
                            <Scatter
                                data={data.scatterData.filter(d => !d.isTrain)}
                                fill="#f59e0b"
                                fillOpacity={0.7}
                                r={4}
                                name="Test"
                            />
                        </ScatterChart>
                    </ResponsiveContainer>
                )}

                {activeTab === 'timeseries' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.timeSeriesData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit=" µg" />
                            <Tooltip
                                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                                labelStyle={{ fontWeight: 700 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="actual"
                                stroke="#6366f1"
                                fill="#6366f1"
                                fillOpacity={0.15}
                                strokeWidth={2}
                                name="PM2.5 Aktual"
                                dot={false}
                            />
                            <Area
                                type="monotone"
                                dataKey="predicted"
                                stroke="#f59e0b"
                                fill="#f59e0b"
                                fillOpacity={0.1}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                name="PM2.5 Prediksi (Regresi)"
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}

                {activeTab === 'importance' && (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data.featureImportance}
                            layout="vertical"
                            margin={{ top: 10, right: 30, bottom: 10, left: 70 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 11, fill: '#94a3b8' }}
                                unit="%"
                                domain={[0, 'auto']}
                            />
                            <YAxis
                                dataKey="feature"
                                type="category"
                                tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                                width={65}
                            />
                            <Tooltip
                                content={({ payload }) => {
                                    if (!payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
                                            <div className="font-semibold text-slate-700 mb-1">{d.feature}</div>
                                            <div>Pengaruh: <span className="font-bold">{d.importance}%</span></div>
                                            <div className="text-slate-400">Koefisien: {d.weight}</div>
                                        </div>
                                    );
                                }}
                            />
                            <Bar dataKey="importance" radius={[0, 6, 6, 0]} barSize={28}>
                                {data.featureImportance.map((_, i) => (
                                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {data.metrics.dataPoints} observasi | Train: {data.metrics.trainSize} | Test: {data.metrics.testSize}
                </span>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" /> Aktual
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Prediksi
                    </span>
                </div>
            </div>
        </div>
    );
}
