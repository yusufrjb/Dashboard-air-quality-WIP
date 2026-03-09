export interface ParameterLimit {
    min: number;
    max: number;
    unit: string;
    label: string;
}

export const IDEAL_LIMITS: Record<string, ParameterLimit> = {
    temperature: {
        min: 22,
        max: 28,
        unit: "°C",
        label: "Suhu Udara", // Standar kenyamanan termal tropis
    },
    humidity: {
        min: 40,
        max: 60,
        unit: "%",
        label: "Kelembapan", // Standar ideal menghindari debu/jamur ekstrim
    },
    pm25: {
        min: 0,
        max: 15.5, // ISPU KLHK 0-50 (Baik)
        unit: "µg/m³",
        label: "Partikulat (PM2.5)",
    },
    pm10: {
        min: 0,
        max: 50, // ISPU KLHK 0-50 (Baik)
        unit: "µg/m³",
        label: "Partikulat (PM10)",
    },
    co: {
        min: 0,
        max: 4000, // ISPU KLHK 0-50 (Baik)
        unit: "µg/m³",
        label: "Karbon Monoksida (CO)",
    },
    o3: {
        min: 0,
        max: 120, // ISPU KLHK 0-50 (Baik)
        unit: "µg/m³",
        label: "Ozon (O3)",
    },
    no2: {
        min: 0,
        max: 80, // ISPU KLHK 0-50 (Baik)
        unit: "µg/m³",
        label: "Nitrogen Dioksida (NO2)",
    }
};

/**
 * Checks if a current value is within its ideal environmental limits.
 */
export function isIdeal(parameter: keyof typeof IDEAL_LIMITS, value: number): boolean {
    const limit = IDEAL_LIMITS[parameter];
    if (!limit) return true; // fallback
    return value >= limit.min && value <= limit.max;
}

/**
 * Returns a human readable string of the limit range
 */
export function getLimitString(parameter: keyof typeof IDEAL_LIMITS): string {
    const limit = IDEAL_LIMITS[parameter];
    if (!limit) return "";
    if (limit.min === 0) return `< ${limit.max} ${limit.unit}`;
    return `${limit.min} - ${limit.max} ${limit.unit}`;
}
