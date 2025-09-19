// src/components/Strategy503020.jsx
import React, { useMemo } from "react";

const fmt = (n, c = "MXN") =>
    new Intl.NumberFormat(c === "MXN" ? "es-MX" : "en-US", {
        style: "currency",
        currency: c,
    }).format(Number.isFinite(n) ? n : 0);

// Convierte MXN → moneda seleccionada (MXN o USD)
const convertDisplay = (amountMx, displayCurrency, usdToMxn) => {
    const r = Number(usdToMxn) || 17.0;
    if (displayCurrency === "USD") return { value: (Number(amountMx) || 0) / r, currency: "USD" };
    return { value: Number(amountMx) || 0, currency: "MXN" };
};

export default function Strategy503020({
    data,              // { needs:{ideal,actual,remaining}, wants:{...}, future:{...} } en MXN
    strategy,          // { needs:{pct,account}, wants:{pct,account}, future:{pct,account} }
    onChangeStrategy,
    accountsMap,
    usdToMxn = 17.0,
    displayCurrency = "MXN",   // <-- NUEVO
}) {
    const safeStrategy = {
        needs: { pct: Number(strategy?.needs?.pct ?? 50), account: strategy?.needs?.account ?? Object.keys(accountsMap || {})[0] },
        wants: { pct: Number(strategy?.wants?.pct ?? 30), account: strategy?.wants?.account ?? Object.keys(accountsMap || {})[0] },
        future: { pct: Number(strategy?.future?.pct ?? 20), account: strategy?.future?.account ?? Object.keys(accountsMap || {})[0] },
    };

    const sumPct = (safeStrategy.needs.pct || 0) + (safeStrategy.wants.pct || 0) + (safeStrategy.future.pct || 0);
    const okPct = sumPct === 100;

    const accountOptions = useMemo(
        () =>
            Object.entries(accountsMap || {}).map(([slug, acc]) => ({
                slug,
                label: acc?.name || slug,
                currency: acc?.currency || "MXN",
            })),
        [accountsMap]
    );

    const recommended = { needs: 50, wants: 30, future: 20 };

    const handlePctChange = (key, val) => {
        const pct = Math.max(0, Math.min(100, Number(val) || 0));
        onChangeStrategy({
            ...safeStrategy,
            [key]: { ...safeStrategy[key], pct },
        });
    };

    const handleAccountChange = (key, slug) => {
        onChangeStrategy({
            ...safeStrategy,
            [key]: { ...safeStrategy[key], account: slug },
        });
    };

    const applyRecommended = () => {
        onChangeStrategy({
            needs: { pct: recommended.needs, account: safeStrategy.needs.account },
            wants: { pct: recommended.wants, account: safeStrategy.wants.account },
            future: { pct: recommended.future, account: safeStrategy.future.account },
        });
    };

    const blocks = [
        {
            key: "needs",
            title: "Necesidades",
            accent: {
                card: "border-orange-200 bg-orange-50",
                title: "text-orange-800",
                value: "text-orange-600",
                border: "border-orange-200/60",
            },
            logo: "/assets/logos/mercadoPago.svg",
        },
        {
            key: "wants",
            title: "Deseos",
            accent: {
                card: "border-teal-200 bg-teal-50",
                title: "text-teal-800",
                value: "text-teal-600",
                border: "border-teal-200/60",
            },
            logo: "/assets/logos/DolarApp.svg",
        },
        {
            key: "future",
            title: "Futuro",
            accent: {
                card: "border-indigo-200 bg-indigo-50",
                title: "text-indigo-800",
                value: "text-indigo-600",
                border: "border-indigo-200/60",
            },
            logo: "/assets/logos/BBVA.svg",
        },
    ];

    return (
        <div className="card card-padding">
            <div className="flex flex-col items-center gap-2 mb-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">
                    Estrategia (personalizable)
                </h2>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <p className="text-center text-gray-600">
                        Recomendada:&nbsp;<b>50%</b> Necesidades · <b>30%</b> Deseos · <b>20%</b> Futuro
                    </p>
                    <button
                        type="button"
                        onClick={applyRecommended}
                        className="btn btn-ghost btn-xs"
                        title="Aplicar recomendada 50/30/20"
                    >
                        Usar 50/30/20
                    </button>
                </div>
                <div className={`text-xs ${okPct ? "text-emerald-700" : "text-rose-700"}`}>
                    Porcentajes seleccionados: <b>{sumPct}%</b> {okPct ? "(válido)" : "(debe sumar 100%)"}
                </div>
                <div className="text-[11px] text-slate-500">
                    Mostrando en: <b>{displayCurrency}</b>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {blocks.map(({ key, title, accent, logo }) => {
                    const pct = safeStrategy[key].pct;
                    const account = safeStrategy[key].account;
                    const info = data?.[key] || { ideal: 0, actual: 0, remaining: 0 };

                    // Convertimos SIEMPRE desde MXN a la moneda global seleccionada
                    const idealConv = convertDisplay(info.ideal, displayCurrency, usdToMxn);
                    const actualConv = convertDisplay(info.actual, displayCurrency, usdToMxn);
                    const remainingConv = convertDisplay(info.remaining, displayCurrency, usdToMxn);

                    return (
                        <div key={key} className={`relative rounded-xl p-4 sm:p-5 min-h-[188px] border ${accent.card}`}>
                            <img src={logo} alt="" className="absolute right-3 top-3 h-6 opacity-80" />

                            <div className="flex items-center justify-between gap-3 mb-2">
                                <h3 className={`text-base sm:text-lg font-semibold ${accent.title}`}>
                                    {title}
                                </h3>

                                {/* % input */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={pct}
                                        onChange={(e) => handlePctChange(key, e.target.value)}
                                        className="w-16 text-sm px-2 py-1 border rounded-lg"
                                        aria-label={`Porcentaje ${title}`}
                                    />
                                    <span className="text-xs text-gray-500">%</span>
                                </div>
                            </div>

                            {/* Cuenta select (sólo define destino; la moneda de display es global) */}
                            <label className="block text-xs text-gray-500 mb-1">Cuenta destino</label>
                            <select
                                value={account}
                                onChange={(e) => handleAccountChange(key, e.target.value)}
                                className="w-full text-sm px-2 py-2 border rounded-lg bg-white"
                                aria-label={`Cuenta para ${title}`}
                            >
                                {accountOptions.map((opt) => (
                                    <option key={opt.slug} value={opt.slug}>
                                        {opt.label} · {opt.currency}
                                    </option>
                                ))}
                            </select>

                            {/* Datos */}
                            <div className={`mt-3 pt-2 text-sm space-y-1 border-t ${accent.border}`}>
                                <p className="text-xs text-gray-500">Presupuesto ideal</p>
                                <p className={`text-lg sm:text-xl font-bold ${accent.value}`}>
                                    {fmt(idealConv.value, idealConv.currency)}
                                </p>
                                <div className="flex justify-between">
                                    <span>Gastado:</span>
                                    <span className="font-semibold">
                                        {fmt(actualConv.value, actualConv.currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between font-semibold">
                                    <span>Restante:</span>
                                    <span>{fmt(remainingConv.value, remainingConv.currency)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {!okPct && (
                <div className="mt-3 text-xs text-rose-700 text-center">
                    Ajusta los porcentajes para que la suma total sea <b>100%</b>.
                </div>
            )}
        </div>
    );
}
