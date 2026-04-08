"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ComposedChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import HeatmapCalendar from "./HeatmapCalendar";
import PeakHourBoxPlot from "./PeakHourBoxPlot";
import { isIdeal, getLimitString } from "@/lib/limits";
import {
  Cloud,
  FlaskConical,
  Flame,
  RefreshCw,
  AlertTriangle,
  Wind,
  Thermometer,
  Droplets,
  Compass,
  TrendingUp,
  TrendingDown,
  Activity,
  Minus,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RealtimeData } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

// interface RealtimeData {
//   pm25?: number | null;
//   pm10?: number | null;
//   no2?: number | null;
//   co?: number | null;
//   temperature?: number | null;
//   humidity?: number | null;
//   [key: string]: unknown;
// }

interface HistoricalDataPoint {
  timestamp?: string;
  created_at?: string;
  time?: string;
  pm2_5_ispu?: number | null;
  pm10_ispu?: number | null;
  no2_ispu?: number | null;
  co_ispu?: number | null;
  o3_ispu?: number | null;
  [key: string]: unknown;
}

interface BmkgWeather {
  suhu: string;
  kelembaban: string;
  kecepatan_angin: string;
  arah_angin: string;
  deskripsi: string;
  icon: string;
}

interface ChartPoint {
  time: string;
  pm25: number;
  pm10: number;
  no2: number;
  co: number;
  o3: number;
}

interface DailyPatternPoint {
  hour: number;
  label: string;
  pm25_avg: number;
  pm25_min: number;
  pm25_max: number;
  pm10_avg: number;
  pm10_min: number;
  pm10_max: number;
}

interface AggStats {
  avg: number;
  max: number;
  min: number;
  stdDev: number;
  p95: number;
  trend: number;
}

// ─── Air Quality Logic ────────────────────────────────────────────────────────

type AQLevel = "good" | "moderate" | "unhealthy" | "very_unhealthy" | "hazardous";
type AQStatus = { label: string; level: AQLevel; percent: number };

function getAirQualityStatus(pollutant: string, ispu: number): AQStatus {
  if (ispu <= 50) {
    return {
      label: "Baik",
      level: "good",
      percent: Math.round((ispu / 50) * 20)
    };
  }
  if (ispu <= 100) {
    return {
      label: "Sedang",
      level: "moderate",
      percent: 20 + Math.round(((ispu - 50) / 50) * 20),
    };
  }
  if (ispu <= 200) {
    return {
      label: "Tidak Sehat",
      level: "unhealthy",
      percent: 40 + Math.round(((ispu - 100) / 100) * 20),
    };
  }
  if (ispu <= 300) {
    return {
      label: "Sangat Tidak Sehat",
      level: "very_unhealthy",
      percent: 60 + Math.round(((ispu - 200) / 100) * 20),
    };
  }
  return {
    label: "Berbahaya",
    level: "hazardous",
    percent: Math.min(100, 80 + Math.round(((ispu - 300) / 200) * 20)),
  };
}

function calcStats(arr: number[]): AggStats {
  if (!arr.length) return { avg: 0, max: 0, min: 0, stdDev: 0, p95: 0, trend: 0 };
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const variance = arr.reduce((a, b) => a + (b - avg) ** 2, 0) / arr.length;
  const stdDev = Math.sqrt(variance);
  const sorted = [...arr].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
  const qSize = Math.max(1, Math.floor(arr.length / 4));
  const firstQ = arr.slice(0, qSize).reduce((a, b) => a + b, 0) / qSize;
  const lastQ = arr.slice(-qSize).reduce((a, b) => a + b, 0) / qSize;
  const trend = firstQ > 0 ? ((lastQ - firstQ) / firstQ) * 100 : 0;
  return { avg, max, min, stdDev, p95, trend };
}

function extractValue(row: HistoricalDataPoint, key: string): number {
  const val = row[key];
  if (val == null) return 0;
  return typeof val === "number" ? val : parseFloat(String(val)) || 0;
}

function getTimestamp(row: HistoricalDataPoint): string {
  return (row.timestamp || row.created_at || row.time || "") as string;
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Badge({ level, label }: { level: AQLevel; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        level === "good" && "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        level === "moderate" && "bg-blue-50 text-blue-700 ring-blue-600/20",
        level === "unhealthy" && "bg-amber-50 text-amber-700 ring-amber-600/20",
        level === "very_unhealthy" && "bg-red-50 text-red-700 ring-red-600/20",
        level === "hazardous" && "bg-purple-50 text-purple-700 ring-purple-600/20"
      )}
    >
      {label}
    </span>
  );
}

function BadgeDark({ level, label }: { level: AQLevel; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        level === "good" && "bg-white/20 text-white ring-white/30",
        level === "moderate" && "bg-white/20 text-white ring-white/30",
        level === "unhealthy" && "bg-white/20 text-white ring-white/30",
        level === "very_unhealthy" && "bg-white/20 text-white ring-white/30",
        level === "hazardous" && "bg-white/20 text-white ring-white/30"
      )}
    >
      {label}
    </span>
  );
}

function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/20", className)}>
      <div
        className="h-full rounded-full bg-white transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function ProgressLight({ value, trackCn, fillCn }: { value: number; trackCn: string; fillCn: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full mt-3", trackCn)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", fillCn)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-6 w-6 rounded-full border-2 border-muted border-t-primary animate-spin",
        className
      )}
    />
  );
}

// ─── Chart loader ─────────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="flex h-52 items-center justify-center">
      <Spinner />
    </div>
  );
}

// ─── Tooltip style ────────────────────────────────────────────────────────────
const tooltipStyle = {
  borderRadius: "0.5rem",
  border: "1px solid hsl(var(--border, 220 14% 91%))",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  fontSize: 12,
  background: "#fff",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface OverviewTabProps {
  realtimeData: RealtimeData | null;
  historicalData?: HistoricalDataPoint[];
}

export default function OverviewTab({ realtimeData, historicalData: _historicalData }: OverviewTabProps) {
  const [timePeriod, setTimePeriod] = useState<1 | 7 | 14 | 30 | 90>(1);
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [bmkgData, setBmkgData] = useState<BmkgWeather | null>(null);
  const [bmkgLoading, setBmkgLoading] = useState(false);
  const [bmkgError, setBmkgError] = useState<string | null>(null);
  const [hourlyPatternData, setHourlyPatternData] = useState<any[]>([]);
  const [hourlyPatternMeta, setHourlyPatternMeta] = useState<any>(null);
  const [hourlyLoading, setHourlyLoading] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh when new data arrives via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel("overview-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tb_konsentrasi_gas" }, () => {
        // Increment key to trigger data refetch in child components and chart
        setRefreshKey(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - timePeriod);
      const sinceIso = since.toISOString();

      // Use air_quality_hourly_agg table for better performance
      const { data, error } = await supabase
        .from('air_quality_hourly_agg')
        .select('time, pm25_ugm3, pm10_corrected_ugm3, no2_ugm3, co_ugm3')
        .gte('time', sinceIso)
        .order('time', { ascending: true });

      if (error) throw error;

      const rows = data || [];

      // Conversion functions from µg/m³ to ISPU
      const pm25ToISPU = (ugm3: number) => {
        if (ugm3 <= 15) return (ugm3 / 15) * 50;
        if (ugm3 <= 35) return 50 + ((ugm3 - 15) / 20) * 50;
        if (ugm3 <= 55) return 100 + ((ugm3 - 35) / 20) * 100;
        if (ugm3 <= 150) return 200 + ((ugm3 - 55) / 95) * 100;
        if (ugm3 <= 250) return 300 + ((ugm3 - 150) / 100) * 100;
        return 400 + ((ugm3 - 250) / 100) * 100;
      };

      const pm10ToISPU = (ugm3: number) => {
        if (ugm3 <= 50) return (ugm3 / 50) * 50;
        if (ugm3 <= 150) return 50 + ((ugm3 - 50) / 100) * 50;
        if (ugm3 <= 350) return 100 + ((ugm3 - 150) / 200) * 100;
        if (ugm3 <= 420) return 200 + ((ugm3 - 350) / 70) * 100;
        if (ugm3 <= 500) return 300 + ((ugm3 - 420) / 80) * 100;
        return 400 + ((ugm3 - 500) / 100) * 100;
      };

      const no2ToISPU = (ugm3: number) => {
        if (ugm3 <= 40) return (ugm3 / 40) * 50;
        if (ugm3 <= 80) return 50 + ((ugm3 - 40) / 40) * 50;
        if (ugm3 <= 180) return 100 + ((ugm3 - 80) / 100) * 100;
        if (ugm3 <= 280) return 200 + ((ugm3 - 180) / 100) * 100;
        if (ugm3 <= 565) return 300 + ((ugm3 - 280) / 285) * 100;
        return 400 + ((ugm3 - 565) / 100) * 100;
      };

      const coToISPU = (ugm3: number) => {
        if (ugm3 <= 5000) return (ugm3 / 5000) * 50;
        if (ugm3 <= 10000) return 50 + ((ugm3 - 5000) / 5000) * 50;
        if (ugm3 <= 17000) return 100 + ((ugm3 - 10000) / 7000) * 100;
        if (ugm3 <= 34000) return 200 + ((ugm3 - 17000) / 17000) * 100;
        if (ugm3 <= 46000) return 300 + ((ugm3 - 34000) / 12000) * 100;
        return 400 + ((ugm3 - 46000) / 10000) * 100;
      };

      setChartData(
        rows.map((row: any) => ({
          time: row.time,
          pm25: pm25ToISPU(row.pm25_ugm3 || 0),
          pm10: pm10ToISPU(row.pm10_corrected_ugm3 || 0),
          no2: no2ToISPU(row.no2_ugm3 || 0),
          co: coToISPU(row.co_ugm3 || 0),
          o3: 0, // O3 not available in hourly agg table
        }))
      );
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [timePeriod, refreshKey]); // re-run chart fetch when refreshKey increments

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  const fetchHourlyPattern = useCallback(async () => {
    setHourlyLoading(true);
    try {
      const res = await fetch("/api/aggregates/hourly-pattern?days=60");
      if (!res.ok) throw new Error("Gagal mengambil pola harian");
      const response = await res.json();
      
      if (response.data && response.meta) {
        setHourlyPatternData(response.data);
        setHourlyPatternMeta(response.meta);
      } else {
        setHourlyPatternData(response);
        setHourlyPatternMeta(null);
      }
    } catch (err) {
      console.error(err);
      setHourlyPatternData([]);
      setHourlyPatternMeta(null);
    } finally {
      setHourlyLoading(false);
    }
  }, [refreshKey]); // re-run pattern fetch when refreshKey increments

  useEffect(() => { fetchHourlyPattern(); }, [fetchHourlyPattern]);

  const fetchBmkg = useCallback(async () => {
    setBmkgLoading(true);
    setBmkgError(null);
    try {
      const res = await fetch("https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=35.78.09.1002");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const cuaca = json?.data?.[0]?.cuaca?.[0]?.[0] ?? json?.data?.[0]?.cuaca?.[0] ?? null;
      if (!cuaca) throw new Error("Format respons BMKG tidak dikenali");
      setBmkgData({
        suhu: cuaca.t ?? cuaca.suhu ?? "--",
        kelembaban: cuaca.hu ?? cuaca.kelembaban ?? "--",
        kecepatan_angin: cuaca.ws ?? cuaca.kecepatan_angin ?? "--",
        arah_angin: cuaca.wd_to ?? cuaca.arah_angin ?? "--",
        deskripsi: cuaca.weather_desc ?? cuaca.deskripsi ?? "--",
        icon: cuaca.image ?? cuaca.icon ?? "",
      });
    } catch (err: unknown) {
      setBmkgError(err instanceof Error ? err.message : "Gagal memuat data BMKG");
    } finally {
      setBmkgLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBmkg();
    const interval = setInterval(fetchBmkg, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBmkg]);

  const stats = useMemo(() => {
    const pm25Vals = chartData.map((d) => d.pm25).filter((v) => v > 0);
    const pm10Vals = chartData.map((d) => d.pm10).filter((v) => v > 0);
    const o3Vals = chartData.map((d) => d.o3).filter((v) => v > 0);
    return {
      pm25: calcStats(pm25Vals),
      pm10: calcStats(pm10Vals),
      o3: calcStats(o3Vals),
    };
  }, [chartData]);

  // dailyPattern calculation removed; now fetched from backend API via fetchHourlyPattern

  const formatXAxis = useCallback(
    (tick: string) => {
      if (!tick) return "";
      const d = new Date(tick);
      if (isNaN(d.getTime())) return tick;
      if (timePeriod <= 1)
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      if (timePeriod <= 14)
        return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:00`;
      return `${d.getDate()}/${d.getMonth() + 1}`;
    },
    [timePeriod]
  );

  if (!realtimeData) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Spinner className="h-8 w-8" />
        <p className="text-sm text-muted-foreground">Memuat data sensor...</p>
      </div>
    );
  }

  const pm25 = realtimeData.pm25 ?? 0;
  const pm10 = realtimeData.pm10 ?? 0;
  const no2 = realtimeData.no2 ?? 0;
  const co = realtimeData.co ?? 0;
  const o3 = realtimeData.o3 ?? 0;
  const temperature = realtimeData.temperature ?? 0;
  const humidity = realtimeData.humidity ?? 0;

  const pm25Status = getAirQualityStatus("pm25", pm25);
  const pm10Status = getAirQualityStatus("pm10", pm10);
  const no2Status = getAirQualityStatus("no2", no2);
  const coStatus = getAirQualityStatus("co", co);
  const o3Status = getAirQualityStatus("o3", o3);

  const periodOptions: Array<{ label: string; value: 1 | 7 | 14 | 30 | 90 }> = [
    { label: "1H", value: 1 },
    { label: "7H", value: 7 },
    { label: "14H", value: 14 },
    { label: "30H", value: 30 },
    { label: "90H", value: 90 },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8 font-sans">

      {/* ── BMKG Error ──────────────────────────────────────────────────────── */}
      {bmkgError && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          <span className="flex-1">Data cuaca BMKG tidak tersedia: {bmkgError}</span>
          <button
            onClick={fetchBmkg}
            className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
          >
            <RefreshCw size={12} />
            Muat Ulang
          </button>
        </div>
      )}

      {/* ── Metric Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <ParameterCard
          parameterKey="pm25"
          title="PM2.5"
          icon={Cloud}
          value={pm25.toFixed(2)}
          unit="ISPU"
          status={pm25Status}
          isActive={activeCard === "pm25"}
          onClick={() => setActiveCard(activeCard === "pm25" ? null : "pm25")}
        />
        <ParameterCard
          parameterKey="pm10"
          title="PM10"
          icon={Cloud}
          value={pm10.toFixed(2)}
          unit="ISPU"
          status={pm10Status}
          isActive={activeCard === "pm10"}
          onClick={() => setActiveCard(activeCard === "pm10" ? null : "pm10")}
        />
        <ParameterCard
          parameterKey="no2"
          title="NO₂"
          icon={FlaskConical}
          value={no2.toFixed(2)}
          unit="ISPU"
          status={no2Status}
          isActive={activeCard === "no2"}
          onClick={() => setActiveCard(activeCard === "no2" ? null : "no2")}
        />
        <ParameterCard
          parameterKey="co"
          title="CO"
          icon={Flame}
          value={co.toFixed(2)}
          unit="ISPU"
          status={coStatus}
          isActive={activeCard === "co"}
          onClick={() => setActiveCard(activeCard === "co" ? null : "co")}
        />
        <ParameterCard
          parameterKey="o3"
          title="O₃"
          icon={Cloud}
          value={o3.toFixed(2)}
          unit="ISPU"
          status={o3Status}
          isActive={activeCard === "o3"}
          onClick={() => setActiveCard(activeCard === "o3" ? null : "o3")}
        />
      </div>

      {/* ── Info row ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Statistik Periode */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity size={15} className="text-muted-foreground" />
            Ringkasan PM2.5
          </h3>

          <div className="text-center mb-3">
            <span className="text-xs text-muted-foreground">Rata-rata PM2.5</span>
            <div className="flex items-baseline justify-center gap-1.5 mt-0.5">
              <span className={cn(
                "text-3xl font-bold tabular-nums",
                stats.pm25.avg <= 15 ? "text-emerald-600" : stats.pm25.avg <= 35 ? "text-blue-600" : stats.pm25.avg <= 55 ? "text-amber-600" : "text-red-600"
              )}>
                {stats.pm25.avg.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">ISPU</span>
            </div>
          </div>

          <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 mb-1">
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3.5 w-1 rounded-full bg-foreground shadow-sm"
              style={{ left: `${Math.min((stats.pm25.avg / 150) * 100, 98)}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground/60 mb-3">
            <span>0</span>
            <span>75</span>
            <span>150 ISPU</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground" title="Minimum PM2.5">Terendah</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{stats.pm25.min.toFixed(1)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground" title="Nilai tertinggi tercatat">Tertinggi</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{stats.pm25.max.toFixed(1)}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground" title="Persentil-95 PM2.5">Hampir Tertinggi</p>
              <p className="text-sm font-semibold text-foreground tabular-nums">{stats.pm25.p95.toFixed(1)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              Tren
              <span className="group/tooltip relative inline-flex cursor-help">
                <Info size={11} className="text-muted-foreground/40" />
                <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/tooltip:block whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background shadow-lg z-10">
                  Std. Deviasi: ± {stats.pm25.stdDev.toFixed(2)} ISPU
                </span>
              </span>
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-xs font-semibold",
                stats.pm25.trend > 0 ? "text-red-500" : stats.pm25.trend < 0 ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {stats.pm25.trend > 0 ? <TrendingUp size={12} /> : stats.pm25.trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
              {stats.pm25.trend >= 0 ? "+" : ""}{stats.pm25.trend.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Kondisi Sensor */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity size={15} className="text-muted-foreground" />
            Kondisi Ruang / Lingkungan
          </h3>
          <div className="flex flex-col gap-3 flex-1 justify-center">

            {/* Suhu */}
            <div className="flex items-center gap-3 rounded-lg p-3 sm:p-4 border border-border bg-muted/30">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Thermometer size={20} className="text-blue-500 sm:h-[24px] sm:w-[24px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start">
                  <p className="truncate text-xs sm:text-sm text-muted-foreground">Suhu</p>
                </div>
                <div className="flex items-end gap-2">
                  <p className="truncate text-lg sm:text-xl font-bold text-foreground">{Number(temperature).toFixed(1)}°C</p>
                </div>
              </div>
            </div>

            {/* Kelembaban */}
            <div className="flex items-center gap-3 rounded-lg p-3 sm:p-4 border border-border bg-muted/30">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-cyan-50">
                <Droplets size={20} className="text-cyan-500 sm:h-[24px] sm:w-[24px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start">
                  <p className="truncate text-xs sm:text-sm text-muted-foreground">Kelembapan</p>
                </div>
                <div className="flex items-end gap-2">
                  <p className="truncate text-lg sm:text-xl font-bold text-foreground">{Number(humidity).toFixed(1)}%</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Data BMKG */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Cloud size={15} className="text-muted-foreground" />
              Data BMKG
            </h3>
            <button
              onClick={fetchBmkg}
              disabled={bmkgLoading}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw size={12} className={bmkgLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          {bmkgLoading ? (
            <div className="flex justify-center py-5">
              <Spinner />
            </div>
          ) : bmkgData ? (
            <div>
              {bmkgData.icon && (
                <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-muted/40 px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bmkgData.icon} alt={bmkgData.deskripsi} className="h-9 w-9" />
                  <span className="text-xs text-muted-foreground">{bmkgData.deskripsi}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <BmkgItem icon={<Thermometer size={13} className="text-orange-400" />} label="Suhu" value={`${bmkgData.suhu}°C`} />
                <BmkgItem icon={<Droplets size={13} className="text-blue-400" />} label="Kelembaban" value={`${bmkgData.kelembaban}%`} />
                <BmkgItem icon={<Wind size={13} className="text-emerald-500" />} label="Angin" value={`${bmkgData.kecepatan_angin} km/h`} />
                <BmkgItem icon={<Compass size={13} className="text-purple-400" />} label="Arah" value={bmkgData.arah_angin} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Data tidak tersedia</p>
          )}
        </div>
      </div>

      {/* ── Daily Pattern ───────────────────────────────────────────────────── */}
      {/* ── Pola Harian & Box Plot Row ─────────────────────────────────────────────── */}
      <div className="grid gap-4 w-full lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm overflow-hidden w-full h-full flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pola Harian (PM2.5)</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {hourlyPatternMeta ? (
                  <>
                    {hourlyPatternMeta.totalWeekdayDays} hari kerja · {hourlyPatternMeta.totalWeekendDays} hari weekend
                    {hourlyPatternMeta.totalWeekendDays === 0 && (
                      <span className="text-amber-600 ml-2">⚠️ Tidak ada data weekend</span>
                    )}
                  </>
                ) : (
                  "Hari Kerja vs Akhir Pekan"
                )}
              </p>
            </div>
            <button
              onClick={fetchHourlyPattern}
              disabled={hourlyLoading}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw size={12} className={hourlyLoading ? "animate-spin" : ""} />
            </button>
          </div>
          {hourlyLoading ? (
            <ChartSkeleton />
          ) : (
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[400px]">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={hourlyPatternData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(val: number, name: string) => [`${val.toFixed(2)} ISPU`, name]} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="weekday_avg" name="Hari Kerja" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                    {hourlyPatternMeta?.hasWeekendData && (
                      <Line type="monotone" dataKey="weekend_avg" name="Akhir Pekan" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} connectNulls={false} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!hourlyPatternMeta?.hasWeekendData && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Data akhir pekan tidak tersedia dalam periode 60 hari terakhir
                </p>
              )}
            </div>
          )}
        </div>
        <div className="w-full flex">
          <PeakHourBoxPlot refreshKey={refreshKey} />
        </div>
      </div>
      {/* ── Trend + Stats ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 w-full overflow-hidden xl:grid-cols-4 lg:grid-cols-3">

        {/* Trend chart */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm xl:col-span-3 lg:col-span-2 overflow-hidden flex flex-col h-full">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Trend Data</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Konsentrasi PM2.5 & PM10</p>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimePeriod(opt.value)}
                  className={cn(
                    "rounded-md px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium transition-all",
                    timePeriod === opt.value
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {chartLoading ? (
            <div className="flex-1 w-full min-h-[220px]">
              <ChartSkeleton />
            </div>
          ) : (
            <div className="w-full overflow-x-auto pb-2 -mx-5 px-5 sm:mx-0 sm:px-0 flex-1 flex flex-col">
              <div className="min-w-[600px] flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatXAxis}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(label: string) => {
                        const d = new Date(label);
                        return isNaN(d.getTime()) ? label : d.toLocaleString("id-ID");
                      }}
                      formatter={(val: number, name: string) => [`${val.toFixed(1)} µg/m³`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Line type="monotone" dataKey="pm25" name="PM2.5" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="pm10" name="PM10" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Heatmap (Swapped from bottom row) */}
        <div className="w-full lg:col-span-1">
          <HeatmapCalendar />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Distribusi CO</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">120 data point terakhir</p>
        </div>
        {chartLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[500px]">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData.slice(-120)} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="coGradNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatXAxis}
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelFormatter={(label: string) => {
                      const d = new Date(label);
                      return isNaN(d.getTime()) ? label : d.toLocaleString("id-ID");
                    }}
                    formatter={(val: number) => [`${val.toFixed(1)} µg/m³`, "CO"]}
                  />
                  <Bar dataKey="co" name="CO" fill="url(#coGradNew)" isAnimationActive={false} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-xs", muted ? "text-muted-foreground/60" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-xs font-semibold", muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}

function BmkgItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <div className="mb-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ParameterCard({
  title,
  icon: Icon,
  value,
  unit,
  status,
  isActive,
  onClick,
  className,
  parameterKey,
  rawValue,
}: {
  title: string;
  icon: React.ElementType;
  value: string;
  unit: string;
  status: AQStatus;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  parameterKey?: string;
  rawValue?: number;
}) {
  const checkValue = rawValue !== undefined ? rawValue : parseFloat(value);
  const dotColorMap: Record<string, string> = {
    good: isActive ? "bg-emerald-500" : "bg-white/70 group-hover:bg-emerald-500",
    moderate: isActive ? "bg-blue-500" : "bg-white/70 group-hover:bg-blue-500",
    unhealthy: isActive ? "bg-amber-500" : "bg-white/70 group-hover:bg-amber-500",
    very_unhealthy: isActive ? "bg-red-500" : "bg-white/70 group-hover:bg-red-500",
  };
  const thinBarColorMap: Record<string, string> = {
    good: isActive ? "bg-emerald-500" : "bg-white/40 group-hover:bg-emerald-500",
    moderate: isActive ? "bg-blue-500" : "bg-white/40 group-hover:bg-blue-500",
    unhealthy: isActive ? "bg-amber-500" : "bg-white/40 group-hover:bg-amber-500",
    very_unhealthy: isActive ? "bg-red-500" : "bg-white/40 group-hover:bg-red-500",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-lg p-3 shadow-sm transition-all duration-200 cursor-pointer border",
        isActive
          ? "border-border bg-card"
          : "border-transparent bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-200/40 hover:border-border hover:bg-card hover:bg-none",
        className
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "h-2 w-2 rounded-full shrink-0",
            dotColorMap[status.level]
          )} />
          <span className={cn(
            "text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200",
            isActive ? "text-muted-foreground" : "text-blue-100 group-hover:text-muted-foreground"
          )}>
            {title}
          </span>
        </div>
        <Icon
          size={14}
          className={cn(
            "shrink-0 transition-colors duration-200",
            isActive ? "text-muted-foreground/60" : "text-blue-200/60 group-hover:text-muted-foreground/60"
          )}
        />
      </div>

      <div className="flex items-baseline gap-1">
        <span className={cn(
          "text-xl sm:text-2xl font-bold tabular-nums leading-tight transition-colors duration-200",
          isActive ? "text-foreground" : "text-white group-hover:text-foreground"
        )}>
          {value}
        </span>
        <span className={cn(
          "text-[10px] transition-colors duration-200",
          isActive ? "text-muted-foreground" : "text-blue-200 group-hover:text-muted-foreground"
        )}>
          {unit}
        </span>
      </div>

      <div className={cn(
        "mt-2 text-[10px] leading-tight transition-colors duration-200",
        isActive
          ? "text-muted-foreground"
          : (parameterKey && isIdeal(parameterKey as any, checkValue) ? "text-emerald-300 group-hover:text-emerald-600" : "text-orange-200 group-hover:text-orange-600")
      )}>
        {parameterKey && (isIdeal(parameterKey as any, checkValue) ? "Aman" : "Berisiko")}
        {parameterKey && <span className="opacity-60"> · {getLimitString(parameterKey as any)}</span>}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-muted/30">
        <div
          className={cn(
            "h-full transition-all duration-500",
            thinBarColorMap[status.level]
          )}
          style={{ width: `${Math.min(status.percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
