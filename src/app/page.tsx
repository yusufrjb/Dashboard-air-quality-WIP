"use client";

import { useEffect, useState } from "react";
import OverviewTab from "@/components/OverviewTab";
import { supabase } from "@/lib/supabase";

import { RealtimeData } from "@/types";

export default function Home() {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("tb_konsentrasi_gas")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        if (data) {
          setRealtimeData({
            pm25: data.pm25_ugm3 || 0,
            pm10: data.pm10_corrected_ugm3 || 0,
            no2: data.no2_ugm3 || 0,
            co: data.co_ugm3 || 0,
            o3: data.o3_ugm3 || 0,
            temperature: data.temperature || 0,
            humidity: data.humidity || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching realtime data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel("realtime-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tb_konsentrasi_gas" },
        (payload) => {
          const newData = payload.new as any;
          if (!newData) return; // Prevent crashes if payload.new is missing (e.g., on DELETE)

          setRealtimeData({
            pm25: newData.pm25_ugm3 || 0,
            pm10: newData.pm10_corrected_ugm3 || 0,
            no2: newData.no2_ugm3 || 0,
            co: newData.co_ugm3 || 0,
            o3: newData.o3_ugm3 || 0,
            temperature: newData.temperature || 0,
            humidity: newData.humidity || 0,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Monitor Kualitas Udara</h1>
              <p className="text-xs text-muted-foreground">Stasiun Pemantau — Jawa Timur</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex flex-col items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
                <span>{currentTime.toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {currentTime.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-6 py-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <OverviewTab realtimeData={realtimeData} />
        )}
      </div>
    </div>
  );
}
