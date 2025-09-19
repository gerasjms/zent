// src/components/AccountBalances.jsx
const fmt = (n, c = "MXN") =>
    new Intl.NumberFormat(c === "MXN" ? "es-MX" : "en-US", { style: "currency", currency: c }).format(n || 0);

export default function AccountBalances({ accountsMap, balances, totalBalanceMx, totalSpentMx, onDeleteAccount }) {
    const accountKeys = Object.keys(accountsMap || {});
    return (
        <div className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-700">Saldos de Cuentas</h2>
            <p className="text-sm text-gray-500 mb-3">Resumen por cuenta (en su propia moneda).</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accountKeys.length === 0 ? (
                    <div className="text-sm text-slate-500">Aún no tienes cuentas. Agrega una para empezar.</div>
                ) : (
                    accountKeys.map((k) => {
                        const a = accountsMap[k];
                        const b = balances[k]?.balance || 0;
                        return (
                            <div key={k} className="relative rounded-xl border border-gray-100 bg-white p-4 pb-10">
                                {/* contenido */}
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-gray-800">{a.name}</h3>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                        {a.currency}
                                    </span>
                                </div>
                                <p className="mt-1 text-lg font-bold text-gray-900">
                                    {new Intl.NumberFormat(a.currency === "MXN" ? "es-MX" : "en-US", { style: "currency", currency: a.currency }).format(b || 0)}
                                </p>

                                {/* botón eliminar - esquina inferior derecha */}
                                <button
                                    type="button"
                                    title="Eliminar cuenta"
                                    onClick={() => onDeleteAccount?.(k)}
                                    className="absolute bottom-2 right-2 inline-flex items-center justify-center
                       h-8 w-8 rounded-full border border-slate-200 bg-white/80
                       text-slate-500 hover:text-red-600 hover:bg-red-50 shadow-sm transition"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M9 3h6a1 1 0 0 1 1 1v1h3a1 1 0 1 1 0 2h-1v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7H4a1 1 0 1 1 0-2h3V4a1 1 0 0 1 1-1Zm1 2h4V5h-4Zm-2 4a1 1 0 1 1 2 0v9a1 1 0 1 1-2 0V9Zm6 0a1 1 0 1 1 2 0v9a1 1 0 1 1-2 0V9Z" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })
                )}
            </div>


            {/* Totales apilados (dos filas) */}
            <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-indigo-800">Total General (aprox. MXN)</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-indigo-600 border border-indigo-200">MXN</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-indigo-900">{fmt(totalBalanceMx, "MXN")}</p>
                </div>

                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-rose-800">Total Gastado (MXN)</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-rose-600 border border-rose-200">MXN</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-rose-900">{fmt(totalSpentMx, "MXN")}</p>
                </div>
            </div>
        </div>
    );
}
