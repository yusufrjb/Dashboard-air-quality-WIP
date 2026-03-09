"use client";

import React, { useMemo } from "react";
import { getRecommendations } from "@/lib/recommendations";
import { Info, HeartPulse, ActivitySquare, Wind } from "lucide-react";

interface SmartRecommendationsProps {
    pm25: number;
}

export default function SmartRecommendations({ pm25 }: SmartRecommendationsProps) {
    const recommendation = useMemo(() => getRecommendations(pm25), [pm25]);

    return (
        <div className={`rounded-xl border shadow-sm p-4 sm:p-5 transition-colors duration-300 ${recommendation.color}`}>
            <div className="flex items-start gap-3 mb-4">
                <div className="mt-0.5 shrink-0 bg-white/50 p-1.5 rounded-full border border-black/5">
                    <Info size={18} className="text-current opacity-80" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-current">Smart Alert: {recommendation.title}</h3>
                    <p className="mt-0.5 text-xs text-current opacity-80 font-medium">
                        Rekomendasi AI berdasarkan pengamatan langsung tingkat konsentrasi PM2.5 ( {pm25} µg/m³ ).
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {/* Health */}
                <div className="bg-white/60 dark:bg-black/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                        <HeartPulse size={15} className="text-current opacity-70" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-current opacity-90">Kesehatan Paru</h4>
                    </div>
                    <p className="text-xs font-medium text-current opacity-90 leading-relaxed">
                        {recommendation.health}
                    </p>
                </div>

                {/* Activity */}
                <div className="bg-white/60 dark:bg-black/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                        <ActivitySquare size={15} className="text-current opacity-70" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-current opacity-90">Aktivitas Fisik</h4>
                    </div>
                    <p className="text-xs font-medium text-current opacity-90 leading-relaxed">
                        {recommendation.activity}
                    </p>
                </div>

                {/* Ventilation */}
                <div className="bg-white/60 dark:bg-black/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Wind size={15} className="text-current opacity-70" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-current opacity-90">Ventilasi Ruangan</h4>
                    </div>
                    <p className="text-xs font-medium text-current opacity-90 leading-relaxed">
                        {recommendation.ventilation}
                    </p>
                </div>
            </div>
        </div>
    );
}
