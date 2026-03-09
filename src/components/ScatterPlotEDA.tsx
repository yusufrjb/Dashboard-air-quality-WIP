"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { ThermometerSun, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AirQualityData {
    pm25_ugm3: number;
    temperature: number;
    humidity: number;
    created_at: string;
}

export default function ScatterPlotEDA() {
    const [data, setData] = useState<AirQualityData[]>([]);
    const [loading, setLoading] = useState(true);
    const [xAxisMode, setXAxisMode] = useState<'temperature' | 'humidity'>('temperature');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        async function fetchData() {
            try {
                setLoading(true);
                // Fetch last 1000 records to show a meaningful correlation
                const { data: rawData, error } = await supabase
                    .from('tb_konsentrasi_gas')
                    .select('pm25_ugm3, temperature, humidity, created_at')
                    .order('created_at', { ascending: false })
                    .limit(1000);

                if (error) {
                    console.error("Error fetching EDA data:", error);
                    return;
                }

                if (rawData) {
                    // Basic clean up: filter out extreme outliers if any, or nulls
                    const cleanData = rawData
                        .filter(d =>
                            d.pm25_ugm3 !== null && d.temperature !== null && d.humidity !== null &&
                            d.pm25_ugm3 >= 0 && d.pm25_ugm3 < 300 && // Reasonable PM2.5 range
                            d.temperature > 10 && d.temperature < 50 && // Reasonable temp range
                            d.humidity > 0 && d.humidity <= 100
                        )
                        .map(d => ({
                            ...d,
                            pm25_ugm3: Number(d.pm25_ugm3),
                            temperature: Number(d.temperature),
                            humidity: Number(d.humidity)
                        }));

                    setData(cleanData);
                }
            } catch (err) {
                console.error("Exception fetching EDA data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const chartData = useMemo(() => {
        return data.map(item => ({
            x: xAxisMode === 'temperature' ? item.temperature : item.humidity,
            y: item.pm25_ugm3,
            z: 1 // For sizing scatter points
        }));
    }, [data, xAxisMode]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/95 border border-slate-200 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-slate-600 font-medium mb-1">
                        {xAxisMode === 'temperature' ? 'Suhu' : 'Kelembapan'}: <span className="text-slate-900 font-bold">{payload[0].value.toFixed(1)}{xAxisMode === 'temperature' ? '°C' : '%'}</span>
                    </p>
                    <p className="text-slate-600 font-medium">
                        PM2.5: <span className="text-rose-600 font-bold">{payload[1].value.toFixed(1)} µg/m³</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const getCorrelationText = () => {
        if (xAxisMode === 'temperature') {
            return "Suhu udara seringkali memiliki pola harian dengan tingkat PM2.5. Suhu yang sangat panas di siang hari biasanya diikuti udara yang lebih kering, sementara PM2.5 bisa terakumulasi di malam/pagi hari saat suhu lebih rendah dan udara lebih stabil.";
        } else {
            return "Saat kelembaban sangat tinggi (udara basah, biasa di malam/pagi hari), polusi udara seperti PM2.5 cenderung lebih berat dan tertahan di dekat permukaan tanah. Hal ini sering menyebabkan kabut campur polusi (smog).";
        }
    };

    if (!mounted) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
            {/* Decorative gradient blob */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Eksplorasi Data Polusi</h3>
                    <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
                        Pahami bagaimana faktor ekologis memengaruhi konsentrasi PM2.5 di udara.
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                    <button
                        onClick={() => setXAxisMode('temperature')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                            xAxisMode === 'temperature'
                                ? "bg-white text-orange-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent"
                        )}
                    >
                        <ThermometerSun className="w-4 h-4" />
                        Suhu
                    </button>
                    <button
                        onClick={() => setXAxisMode('humidity')}
                        className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                            xAxisMode === 'humidity'
                                ? "bg-white text-blue-600 border border-slate-200 shadow-sm"
                                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 border border-transparent"
                        )}
                    >
                        <Droplets className="w-4 h-4" />
                        Kelembapan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 bg-slate-50/50 rounded-xl p-4 border border-slate-100 h-[350px]">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-600" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis
                                    type="number"
                                    dataKey="x"
                                    name={xAxisMode === 'temperature' ? 'Suhu' : 'Kelembapan'}
                                    unit={xAxisMode === 'temperature' ? '°C' : '%'}
                                    domain={['auto', 'auto']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="y"
                                    name="PM2.5"
                                    unit=" µg/m³"
                                    domain={[0, 'auto']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                />
                                <ZAxis type="number" dataKey="z" range={[20, 20]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }} content={<CustomTooltip />} />
                                <Scatter
                                    name="Korelasi"
                                    data={chartData}
                                    fill={xAxisMode === 'temperature' ? '#f97316' : '#3b82f6'}
                                    opacity={0.6}
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="lg:col-span-1 flex flex-col justify-center">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                        <h4 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
                            <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                                💡
                            </span>
                            Insight Ekologis
                        </h4>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {getCorrelationText()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
