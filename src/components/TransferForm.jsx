// src/components/TransferForm.jsx
import { useMemo, useState } from "react";

export default function TransferForm({ ACCOUNTS, onAddTransfer, onNotify }) {
    const [from, setFrom] = useState("bbva");
    const [to, setTo] = useState("mercadoPago");
    const [amountSent, setAmountSent] = useState("");
    const [rate, setRate] = useState("");
    const [amountReceived, setAmountReceived] = useState("");

    const isUsdToMxn =
        ACCOUNTS[from]?.currency === "USD" && ACCOUNTS[to]?.currency === "MXN";

    // Cálculo en vivo del spread y % al teclear
    const liveSpread = useMemo(() => {
        const amt = parseFloat(amountSent);
        const r = parseFloat(rate);
        const rec = parseFloat(amountReceived);
        if (!isUsdToMxn || !amt || !r || !rec) return null;

        const expected = amt * r;
        const spr = expected - rec;
        const pct = expected > 0 ? (spr / expected) * 100 : 0;
        return { amount: spr, pct: pct };
    }, [amountSent, rate, amountReceived, isUsdToMxn]);

    const canSubmit = useMemo(() => {
        const amt = parseFloat(amountSent);
        if (!from || !to || from === to || !amt || amt <= 0) return false;
        if (isUsdToMxn) {
            const r = parseFloat(rate);
            const rec = parseFloat(amountReceived);
            if (!r || r <= 0 || !rec || rec <= 0) return false;
        }
        return true;
    }, [from, to, amountSent, rate, amountReceived, isUsdToMxn]);

    const submit = (e) => {
        e.preventDefault();
        if (!canSubmit) {
            onNotify("Revisa los campos antes de continuar.", "error");
            return;
        }

        const payload = {
            from,
            to,
            amountSent: parseFloat(amountSent),
        };

        if (isUsdToMxn) {
            const expected = parseFloat(amountSent) * parseFloat(rate);
            const spr = expected - parseFloat(amountReceived);
            Object.assign(payload, {
                rate: parseFloat(rate),
                amountReceived: parseFloat(amountReceived),
                spread: spr,
            });
        }

        onAddTransfer(payload);
        setAmountSent("");
        setRate("");
        setAmountReceived("");
    };

    return (
        <section className="bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-xl font-semibold mb-3 text-center text-gray-900">
                Transferencia entre Cuentas
            </h2>

            <form
                onSubmit={submit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end"
            >
                <div>
                    <label className="block text-sm text-gray-600 mb-1">De</label>
                    <select
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {Object.keys(ACCOUNTS).map((k) => (
                            <option key={k} value={k}>
                                {ACCOUNTS[k].name} ({ACCOUNTS[k].currency})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">A</label>
                    <select
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {Object.keys(ACCOUNTS).map((k) => (
                            <option key={k} value={k}>
                                {ACCOUNTS[k].name} ({ACCOUNTS[k].currency})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-gray-600 mb-1">
                        Monto Enviado ({ACCOUNTS[from]?.currency})
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={amountSent}
                        onChange={(e) => setAmountSent(e.target.value)}
                        placeholder="100.00"
                        className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                {isUsdToMxn && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                Tipo de cambio (USD→MXN)
                            </label>
                            <input
                                type="number"
                                step="0.0001"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                placeholder="19.50"
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                                Ingresa el tipo de cambio aplicado por el proveedor.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">
                                Monto Recibido (MXN)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={amountReceived}
                                onChange={(e) => setAmountReceived(e.target.value)}
                                placeholder="1950.00"
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                                La cantidad que llegó efectivamente a la cuenta MXN.
                            </p>
                        </div>
                    </div>
                )}

                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className={`w-full font-semibold py-2.5 rounded-lg transition ${canSubmit
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                : "bg-gray-200 text-gray-500 cursor-not-allowed"
                            }`}
                    >
                        Registrar transferencia
                    </button>
                </div>
            </form>

            {/* Resumen de spread (si aplica) */}
            {liveSpread && (
                <div className="mt-4 text-center bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                    <p className="text-sm text-gray-800">
                        Spread cobrado:{" "}
                        <span className="font-semibold">
                            ${liveSpread.amount.toFixed(2)}
                        </span>{" "}
                        (
                        <span className="font-semibold">
                            {liveSpread.pct.toFixed(2)}%
                        </span>
                        )
                    </p>
                </div>
            )}
        </section>
    );
}
