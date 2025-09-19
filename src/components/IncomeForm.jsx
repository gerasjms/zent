import { useEffect, useMemo, useState } from "react";

export default function IncomeForm({ ACCOUNTS, onAddIncome, onNotify }) {
    const accountKeys = useMemo(() => Object.keys(ACCOUNTS || {}), [ACCOUNTS]);

    // primera cuenta disponible
    const firstAccount = accountKeys[0] || "";

    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [rate, setRate] = useState("");
    const [account, setAccount] = useState(firstAccount);
    const [isSalary, setIsSalary] = useState(false);

    // cuando cambian las cuentas, o la moneda, selecciona una válida
    useEffect(() => {
        if (!accountKeys.length) {
            setAccount("");
            return;
        }
        // si cuenta actual no existe o no coincide con moneda → elige primera que coincida
        const current = ACCOUNTS[account];
        if (!current || current.currency !== currency) {
            const sameCurrency = accountKeys.find(k => ACCOUNTS[k].currency === currency);
            setAccount(sameCurrency || accountKeys[0]);
        }
    }, [currency, accountKeys.join(","), ACCOUNTS, account]);

    const submit = async (e) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!numericAmount || numericAmount <= 0 || !account) {
            onNotify("Por favor, ingresa un monto válido y selecciona una cuenta.", "error");
            return;
        }
        await onAddIncome({
            amount: numericAmount,
            currency,
            manualRate: parseFloat(rate) || null,
            account,     // 👈 se guarda en la cuenta elegida
            isSalary,
        });
        // reset conservador: re-selecciona una cuenta válida para la moneda actual
        const nextAccount = accountKeys.find(k => ACCOUNTS[k].currency === currency) || accountKeys[0] || "";
        setAmount("");
        setRate("");
        setIsSalary(false);
        setAccount(nextAccount);
    };

    const segBtn = (isActive) =>
        `btn btn-sm flex-1 ${isActive ? "btn-primary" : "btn-ghost"}`;

    const hasAccounts = accountKeys.length > 0;

    return (
        <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 text-gray-700">Agregar ingreso</h2>

            <form onSubmit={submit} className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                {/* Monto */}
                <div>
                    <label className="label">Monto</label>
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="10000"
                        required
                        className="input"
                    />
                </div>

                {/* Moneda */}
                <div>
                    <label className="label">Moneda</label>
                    <div className="w-full bg-slate-100 p-1 rounded-xl border border-slate-200 flex" role="group" aria-label="Seleccionar moneda">
                        <button type="button" onClick={() => setCurrency("MXN")}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition rounded-l-xl ${currency === "MXN" ? "bg-blue-600 text-white shadow-sm" : "bg-transparent text-slate-700 hover:bg-white"}`}>
                            MXN
                        </button>
                        <button type="button" onClick={() => setCurrency("USD")}
                            className={`flex-1 px-3 py-2 text-sm font-medium transition rounded-r-xl ${currency === "USD" ? "bg-blue-600 text-white shadow-sm" : "bg-transparent text-slate-700 hover:bg-white"}`}>
                            USD
                        </button>
                    </div>
                </div>

                {/* Tipo de cambio (solo USD) */}
                {currency === "USD" && (
                    <div>
                        <label className="label">Tipo de cambio (opcional)</label>
                        <input
                            type="number"
                            step="0.0001"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            placeholder="Automático si se deja vacío"
                            className="input"
                        />
                    </div>
                )}

                {/* Cuenta */}
                <div>
                    <label className="label">Depositar en cuenta</label>
                    <select
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        className="select"
                        disabled={!hasAccounts}
                    >
                        {accountKeys
                            .filter(k => ACCOUNTS[k].currency === currency)
                            .map((k) => (
                                <option key={k} value={k}>{ACCOUNTS[k].name}</option>
                            ))}
                    </select>
                    {!hasAccounts && (
                        <p className="text-xs text-slate-500 mt-1">No tienes cuentas aún. Crea una debajo.</p>
                    )}
                </div>

                {/* Checkbox salario */}
                <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={isSalary}
                        onChange={(e) => setIsSalary(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Es parte de mi salario (50/30/20)
                </label>

                {/* Botón */}
                <button type="submit" className="btn btn-primary w-full" disabled={!hasAccounts}>
                    Agregar ingreso
                </button>
            </form>
        </section>
    );
}
