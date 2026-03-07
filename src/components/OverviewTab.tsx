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
  pm25_ugm3?: number | null;
  pm10_corrected_ugm3?: number | null;
  no2_ugm3?: number | null;
  co_ugm3?: number | null;
  o3_ugm3?: number | null;
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

function getAirQualityStatus(pollutant: string, value: number): AQStatus {
  // Threshold arrays for each pollutant [Baik, Sedang, Tidak Sehat, Sangat Tidak Sehat]
  // Values above the last threshold are "Berbahaya"
  // CO thresholds in PPM: 9, 34, 64, 124
  const thresholds: Record<string, number[]> = {
    pm25: [15, 35, 55, 150],
    pm10: [15, 35, 55, 150],
    no2: [80, 180, 280, 480],
    co: [9, 34, 64, 124],
    o3: [50, 100, 150, 250],
  };

  let val = value;
  if (pollutant === "co") {
    // Convert CO from µg/m³ to ppm (1 ppm ≈ 1.145 mg/m³ = 1145 µg/m³)
    val = value / 1145;
  }

  const levels = thresholds[pollutant] ?? [50, 100, 150, 250];

  if (val <= levels[0]) {
    return {
      label: "Baik",
      level: "good",
      percent: Math.round((val / levels[0]) * 20)
    };
  }
  if (val <= levels[1]) {
    return {
      label: "Sedang",
      level: "moderate",
      percent: 20 + Math.round(((val - levels[0]) / (levels[1] - levels[0])) * 20),
    };
  }
  if (val <= levels[2]) {
    return {
      label: "Tidak Sehat",
      level: "unhealthy",
      percent: 40 + Math.round(((val - levels[1]) / (levels[2] - levels[1])) * 20),
    };
  }
  if (val <= levels[3]) {
    return {
      label: "Sangat Tidak Sehat",
      level: "very_unhealthy",
      percent: 60 + Math.round(((val - levels[2]) / (levels[3] - levels[2])) * 20),
    };
  }
  return {
    label: "Berbahaya",
    level: "hazardous",
    percent: Math.min(100, 80 + Math.round(((val - levels[3]) / levels[3]) * 20)),
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

  const fetchChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - timePeriod);
      const sinceIso = since.toISOString();

      let table: string;
      let tsCol: string;
      if (timePeriod <= 1) { table = "tb_konsentrasi_gas"; tsCol = "created_at"; }
      else if (timePeriod <= 14) { table = "air_quality_hourly_agg"; tsCol = "timestamp"; }
      else { table = "air_quality_daily_agg"; tsCol = "timestamp"; }

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .gte(tsCol, sinceIso)
        .order(tsCol, { ascending: true })
        .limit(2000);

      if (error) throw error;

      const rows = (data as HistoricalDataPoint[]) ?? [];
      setChartData(
        rows.map((row) => ({
          time: getTimestamp(row),
          pm25: extractValue(row, timePeriod <= 1 ? "pm25_ugm3" : "pm25"),
          pm10: extractValue(row, timePeriod <= 1 ? "pm10_corrected_ugm3" : "pm10"),
          no2: extractValue(row, timePeriod <= 1 ? "no2_ugm3" : "no2"),
          co: extractValue(row, timePeriod <= 1 ? "co_ugm3" : "co") / 1000,
          o3: extractValue(row, timePeriod <= 1 ? "o3_ugm3" : "o3"),
        }))
      );
    } catch {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

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

  const dailyPattern = useMemo((): DailyPatternPoint[] => {
    const buckets: Record<number, { pm25: number[]; pm10: number[] }> = {};
    for (let h = 0; h < 24; h++) buckets[h] = { pm25: [], pm10: [] };
    chartData.forEach((d) => {
      if (!d.time) return;
      const date = new Date(d.time);
      const h = date.getHours();
      if (!isNaN(h)) {
        if (d.pm25 > 0) buckets[h].pm25.push(d.pm25);
        if (d.pm10 > 0) buckets[h].pm10.push(d.pm10);
      }
    });
    return Array.from({ length: 24 }, (_, h) => {
      const b = buckets[h];
      const pm25Sorted = [...b.pm25].sort((a, c) => a - c);
      const pm10Sorted = [...b.pm10].sort((a, c) => a - c);
      const avg = (arr: number[]) => arr.length ? arr.reduce((a, c) => a + c, 0) / arr.length : 0;
      return {
        hour: h,
        label: `${String(h).padStart(2, "0")}:00`,
        pm25_avg: avg(b.pm25),
        pm25_min: pm25Sorted[0] ?? 0,
        pm25_max: pm25Sorted[pm25Sorted.length - 1] ?? 0,
        pm10_avg: avg(b.pm10),
        pm10_min: pm10Sorted[0] ?? 0,
        pm10_max: pm10Sorted[pm10Sorted.length - 1] ?? 0,
      };
    });
  }, [chartData]);

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
  const coStatus = getAirQualityStatus("co", co / 1000);
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
      <div className="flex flex-wrap gap-2 sm:gap-4">
        <ParameterCard
          title="PM2.5"
          icon={Cloud}
          value={pm25.toFixed(1)}
          unit="µg/m³"
          status={pm25Status}
          isActive={activeCard === "pm25"}
          onClick={() => setActiveCard(activeCard === "pm25" ? null : "pm25")}
          className="w-[calc(33.333%-0.34rem)] sm:w-[calc(33.333%-0.67rem)] lg:w-[calc(20%-0.8rem)] flex-auto"
        />
        <ParameterCard
          title="PM10"
          icon={Cloud}
          value={pm10.toFixed(1)}
          unit="µg/m³"
          status={pm10Status}
          isActive={activeCard === "pm10"}
          onClick={() => setActiveCard(activeCard === "pm10" ? null : "pm10")}
          className="w-[calc(33.333%-0.34rem)] sm:w-[calc(33.333%-0.67rem)] lg:w-[calc(20%-0.8rem)] flex-auto"
        />
        <ParameterCard
          title="NO₂"
          icon={FlaskConical}
          value={no2.toFixed(1)}
          unit="µg/m³"
          status={no2Status}
          isActive={activeCard === "no2"}
          onClick={() => setActiveCard(activeCard === "no2" ? null : "no2")}
          className="w-[calc(33.333%-0.34rem)] sm:w-[calc(33.333%-0.67rem)] lg:w-[calc(20%-0.8rem)] flex-auto"
        />
        <ParameterCard
          title="CO"
          icon={Flame}
          value={(co / 1000).toFixed(2)}
          unit="mg/m³"
          status={coStatus}
          isActive={activeCard === "co"}
          onClick={() => setActiveCard(activeCard === "co" ? null : "co")}
          className="w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(20%-0.8rem)] flex-auto"
        />
        <ParameterCard
          title="O₃"
          icon={Cloud}
          value={o3.toFixed(1)}
          unit="µg/m³"
          status={o3Status}
          isActive={activeCard === "o3"}
          onClick={() => setActiveCard(activeCard === "o3" ? null : "o3")}
          className="w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(20%-0.8rem)] flex-auto"
        />
      </div>

      {/* ── Info row ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">

        {/* Statistik Periode */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity size={15} className="text-muted-foreground" />
            Statistik Periode
          </h3>
          <div className="space-y-2">
            <StatRow label="Rata-rata PM2.5" value={`${stats.pm25.avg.toFixed(1)} µg/m³`} />
            <StatRow label="Minimum PM2.5" value={`${stats.pm25.min.toFixed(1)} µg/m³`} />
            <StatRow label="Persentil-95 PM2.5" value={`${stats.pm25.p95.toFixed(1)} µg/m³`} />
            <div className="my-2 border-t border-border" />
            <StatRow label="Std. Deviasi" value={`± ${stats.pm25.stdDev.toFixed(2)}`} muted />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tren</span>
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
        </div>

        {/* Kondisi Sensor */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Activity size={15} className="text-muted-foreground" />
            Kondisi Sensor
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-orange-50 p-2 sm:p-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                <Thermometer size={16} className="text-orange-500 sm:h-[18px] sm:w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] sm:text-[11px] text-muted-foreground">Suhu</p>
                <p className="truncate text-sm sm:text-lg font-bold text-foreground">{Number(temperature).toFixed(1)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2 sm:p-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <Droplets size={16} className="text-blue-500 sm:h-[18px] sm:w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] sm:text-[11px] text-muted-foreground">Kelembaban</p>
                <p className="truncate text-sm sm:text-lg font-bold text-foreground">{Number(humidity).toFixed(1)}%</p>
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
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Pola Harian</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Rata-rata konsentrasi per jam dalam periode</p>
          </div>
          <button
            onClick={fetchChartData}
            disabled={chartLoading}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw size={12} className={chartLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        {chartLoading ? (
          <ChartSkeleton />
        ) : (
          <div className="w-full overflow-x-auto pb-2">
            <div className="min-w-[500px]">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={dailyPattern} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pm25GradNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(val: number, name: string) => [`${val.toFixed(1)} µg/m³`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="pm25_avg" name="PM2.5" stroke="#3b82f6" strokeWidth={2} fill="url(#pm25GradNew)" isAnimationActive={false} />
                  <Line type="monotone" dataKey="pm10_avg" name="PM10" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── Trend + Stats ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Trend chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Trend Data</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Konsentrasi PM2.5 & PM10</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
              {periodOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTimePeriod(opt.value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-all",
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
            <ChartSkeleton />
          ) : (
            <div className="w-full overflow-x-auto pb-2">
              <div className="min-w-[600px]">
                <ResponsiveContainer width="100%" height={220}>
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
                    <Line type="monotone" dataKey="o3" name="O3" stroke="#059669" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Stats table */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Ringkasan Statistik</h3>
          <div className="w-full overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Metrik</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">PM2.5</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">PM10</th>
                  <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">O3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Avg", pm25: stats.pm25.avg, pm10: stats.pm10.avg, o3: stats.o3.avg },
                  { label: "Max", pm25: stats.pm25.max, pm10: stats.pm10.max, o3: stats.o3.max },
                  { label: "Min", pm25: stats.pm25.min, pm10: stats.pm10.min, o3: stats.o3.min },
                  { label: "P95", pm25: stats.pm25.p95, pm10: stats.pm10.p95, o3: stats.o3.p95 },
                ].map((row, i) => (
                  <tr key={row.label} className={cn("transition-colors hover:bg-muted/30", i % 2 === 1 && "bg-muted/10")}>
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.label}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-blue-600">{row.pm25.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">{row.pm10.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-teal-600">{row.o3.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Satuan: µg/m³</p>
        </div>
      </div>

      {/* ── CO Distribution ──────────────────────────────────────────────────── */}
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
}: {
  title: string;
  icon: React.ElementType;
  value: string;
  unit: string;
  status: AQStatus;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl p-3 sm:p-5 shadow-sm transition-all duration-300 cursor-pointer border",
        isActive
          ? "border-border bg-card"
          : "border-transparent bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-200 hover:border-border hover:bg-card hover:bg-none",
        className
      )}
    >
      <div
        className={cn(
          "absolute -right-4 -top-4 h-20 w-20 rounded-full transition-colors duration-300 pointer-events-none",
          isActive ? "bg-blue-50" : "bg-white/10 group-hover:bg-blue-50"
        )}
      />
      <div
        className={cn(
          "absolute -bottom-6 -left-2 h-16 w-16 rounded-full transition-opacity duration-300 pointer-events-none",
          isActive ? "opacity-0" : "bg-white/5 opacity-100 group-hover:opacity-0"
        )}
      />
      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-widest transition-colors duration-300",
              isActive ? "text-muted-foreground" : "text-blue-100 group-hover:text-muted-foreground"
            )}
          >
            {title}
          </span>
          <Icon
            size={18}
            className={cn(
              "transition-colors duration-300",
              isActive ? "text-blue-500" : "text-blue-200 group-hover:text-blue-500"
            )}
          />
        </div>

        {/* Badge mapping */}
        {isActive ? (
          <Badge level={status.level} label={status.label} />
        ) : (
          <>
            <div className="group-hover:hidden"><BadgeDark level={status.level} label={status.label} /></div>
            <div className="hidden group-hover:block"><Badge level={status.level} label={status.label} /></div>
          </>
        )}

        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={cn(
              "text-2xl sm:text-4xl font-bold tabular-nums transition-colors duration-300",
              isActive ? "text-foreground" : "text-white group-hover:text-foreground"
            )}
          >
            {value}
          </span>
          <span
            className={cn(
              "text-[10px] sm:text-xs transition-colors duration-300",
              isActive ? "text-muted-foreground" : "text-blue-200 group-hover:text-muted-foreground"
            )}
          >
            {unit}
          </span>
        </div>

        {isActive ? (
          <ProgressLight value={status.percent} trackCn="bg-blue-100" fillCn="bg-blue-500" />
        ) : (
          <>
            <div className="group-hover:hidden mt-3">
              <Progress value={status.percent} className="bg-white/20" />
            </div>
            <div className="hidden group-hover:block">
              <ProgressLight value={status.percent} trackCn="bg-blue-100" fillCn="bg-blue-500" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
