// src/components/ExpenseForm.jsx
import { useEffect, useState } from "react";

export default function ExpenseForm({ ACCOUNTS, CATEGORIES, onAddExpense, onNotify }) {
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [category, setCategory] = useState("Supermercado");
    const [account, setAccount] = useState("mercadoPago");

    // Si cambia la moneda, ajusta la cuenta para que coincida con la misma divisa
    useEffect(() => {
        if (ACCOUNTS[account]?.currency !== currency) {
            const first = Object.keys(ACCOUNTS).find(k => ACCOUNTS[k].currency === currency);
            if (first) setAccount(first);
        }
    }, [currency, account, ACCOUNTS]);

    const submit = async (e) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!numericAmount || numericAmount <= 0 || !category || !account) {
            onNotify("Por favor, completa todos los campos válidamente.", "error");
            return;
        }
        await onAddExpense({ amount: numericAmount, currency, category, account });
        setAmount("");
    };

    const filteredAccounts = Object.keys(ACCOUNTS).filter(k => ACCOUNTS[k].currency === currency);

    // ——— estilos para el toggle de moneda (segmentado) ———
    const segBtn = (isActive) =>
        `btn btn-sm flex-1 ${isActive ? "btn-primary" : "btn-ghost"}`;

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
                    <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
                        <button
                            type="button"
                            onClick={() => setCurrency("MXN")}
                            className={segBtn(currency === "MXN")}
                            aria-pressed={currency === "MXN"}
                        >
                            MXN
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrency("USD")}
                            className={segBtn(currency === "USD")}
                            aria-pressed={currency === "USD"}
                        >
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
                    >
                        {filteredAccounts.map((k) => (
                            <option key={k} value={k}>
                                {ACCOUNTS[k].name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Submit */}
                <button type="submit" className="btn btn-primary w-full">
                    Agregar egreso
                </button>
            </form>
        </section>
    );
}
