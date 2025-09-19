import { useEffect, useMemo, useState } from "react";

export default function ExpenseForm({ ACCOUNTS, CATEGORIES, onAddExpense, onNotify }) {
    const accountKeys = useMemo(() => Object.keys(ACCOUNTS || {}), [ACCOUNTS]);

    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [category, setCategory] = useState("Supermercado");
    const [account, setAccount] = useState("");

    // siempre selecciona una cuenta válida para la moneda actual
    useEffect(() => {
        if (!accountKeys.length) {
            setAccount("");
            return;
        }
        const current = ACCOUNTS[account];
        if (!current || current.currency !== currency) {
            const sameCurrency = accountKeys.find(k => ACCOUNTS[k].currency === currency);
            setAccount(sameCurrency || accountKeys[0]);
        }
    }, [currency, accountKeys.join(","), ACCOUNTS, account]);

    const submit = async (e) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!numericAmount || numericAmount <= 0 || !category || !account) {
            onNotify("Por favor, completa todos los campos válidamente.", "error");
            return;
        }
        await onAddExpense({ amount: numericAmount, currency, category, account }); // 👈 guarda en la cuenta elegida
        setAmount("");
    };

    const filteredAccounts = accountKeys.filter(k => ACCOUNTS[k].currency === currency);
    const hasAccounts = filteredAccounts.length > 0;

    return (
        <section className="mt-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 text-gray-700">Agregar Egreso</h2>

            <form onSubmit={submit} className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                {/* Monto */}
                <div>
                    <label className="label">Monto ({currency})</label>
                    <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="500"
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

                {/* Categoría */}
                <div>
                    <label className="label">Categoría</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        className="select"
                    >
                        {Object.keys(CATEGORIES).map((group) => (
                            <optgroup key={group} label={group}>
                                {CATEGORIES[group].items.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Cuenta */}
                <div>
                    <label className="label">Pagar con</label>
                    <select
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                        className="select"
                        disabled={!hasAccounts}
                    >
                        {filteredAccounts.map((k) => (
                            <option key={k} value={k}>
                                {ACCOUNTS[k].name}
                            </option>
                        ))}
                    </select>
                    {!hasAccounts && (
                        <p className="text-xs text-slate-500 mt-1">No hay cuentas en {currency}. Crea una debajo.</p>
                    )}
                </div>

                {/* Submit */}
                <button type="submit" className="btn btn-primary w-full" disabled={!hasAccounts}>
                    Agregar egreso
                </button>
            </form>
        </section>
    );
}
