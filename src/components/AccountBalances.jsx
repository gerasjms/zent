// src/components/AccountBalances.jsx
const DOT = {
    indigo: "bg-indigo-500",
    orange: "bg-orange-500",
    teal: "bg-teal-500",
    green: "bg-green-500",
    red: "bg-red-500",
};

const fmt = (n, c = "MXN") =>
    new Intl.NumberFormat(c === "MXN" ? "es-MX" : "en-US", { style: "currency", currency: c }).format(n || 0);

export default function AccountBalances({ ACCOUNTS, balances, totalBalance }) {
    return (
        <div className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 text-gray-700">Saldos de Cuentas</h2>
            <p className="text-sm text-gray-500 mb-3">Resumen por cuenta (estimado en su moneda).</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(ACCOUNTS).map(k => {
                    const a = ACCOUNTS[k];
                    const b = balances[k]?.balance || 0;
                    return (
                        <div key={k} className="rounded-xl border border-gray-100 bg-white p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800">{a.name}</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                    {a.currency}
                                </span>
                            </div>
                            <p className="mt-1 text-lg font-bold text-gray-900">{fmt(b, a.currency)}</p>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-indigo-800">Total General (aprox. MXN)</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-indigo-600 border border-indigo-200">
                        MXN
                    </span>
                </div>
                <p className="mt-1 text-2xl font-bold text-indigo-900">{fmt(totalBalance)}</p>
            </div>
        </div>

    );
}
