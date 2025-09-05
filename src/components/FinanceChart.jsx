// src/components/FinanceChart.jsx
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const fmt = (n) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n ?? 0);

export default function FinanceChart({
    data,
    options,
    chartView,
    setChartView,
    totalSalaryIncome,
    totalGlobalIncome,
}) {
    // Fallbacks
    const safeData =
        data && Array.isArray(data.labels)
            ? data
            : { labels: ["Sin datos"], datasets: [{ data: [1], backgroundColor: ["#e5e7eb"] }] };

    // Opciones + padding interno del lienzo
    const baseOptions =
        options || {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom" },
                tooltip: { callbacks: { label: (c) => `${c.label}: ${fmt(c.parsed)}` } },
            },
        };

    // Merge sin perder lo que te llegue por props
    const mergedOptions = {
        ...baseOptions,
        layout: { ...(baseOptions.layout || {}), padding: 20 }, // 👈 más aire alrededor del pie
        plugins: {
            ...(baseOptions.plugins || {}),
            legend: {
                ...(baseOptions.plugins?.legend || {}),
                labels: {
                    ...(baseOptions.plugins?.legend?.labels || {}),
                    padding: 16, // 👈 aire entre etiquetas de la leyenda
                },
            },
        },
    };

    const segBtn = (active) => `btn btn-sm flex-1 ${active ? "btn-primary" : "btn-ghost"}`;
    const isStrategy = chartView === "strategy";

    return (
        // 👇 más padding en la tarjeta
        <section className="card card-soft p-6 sm:p-8 lg:p-10">
            {/* Toggle */}
            <div className="flex justify-center mb-4">
                <div className="bg-slate-100 p-1 rounded-lg flex w-full max-w-xs gap-1">
                    <button
                        type="button"
                        onClick={() => setChartView("strategy")}
                        className={segBtn(isStrategy)}
                        aria-pressed={isStrategy}
                    >
                        Estrategia (Salario)
                    </button>
                    <button
                        type="button"
                        onClick={() => setChartView("global")}
                        className={segBtn(!isStrategy)}
                        aria-pressed={!isStrategy}
                    >
                        Global
                    </button>
                </div>
            </div>

            {/* Títulos */}
            <h2 className="text-xl sm:text-2xl font-bold mb-1 text-center text-gray-800">
                {isStrategy ? "Distribución de tu Salario" : "Distribución Global"}
            </h2>
            <p className="text-center text-gray-600 mb-6">
                Total ingresado ({isStrategy ? "Salario" : "Global"}):
                <span className="font-bold text-emerald-700 ml-2">
                    {fmt(isStrategy ? totalSalaryIncome : totalGlobalIncome)}
                </span>
            </p>

            {/* Contenedor del gráfico con padding lateral extra */}
            <div className="relative h-80 md:h-[28rem] lg:h-[32rem] flex items-center justify-center px-3 sm:px-6">
                <Pie data={safeData} options={mergedOptions} />
            </div>
        </section>
    );
}
