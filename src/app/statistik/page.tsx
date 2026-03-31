import React from 'react';
import MLForecastPrototype from '@/components/MLForecastPrototype';
import RegressionVisualization from '@/components/RegressionVisualization';

export default function StatistikPage() {
    return (
        <div className="w-full p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Statistik & Analisis Data</h1>
                <p className="text-slate-500">Jelajahi wawasan mendalam dan korelasi data kualitas udara.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <MLForecastPrototype />
                <RegressionVisualization />
            </div>
        </div>
    );
}
