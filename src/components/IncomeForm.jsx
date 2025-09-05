// src/components/IncomeForm.jsx
import { useState } from "react";

export default function IncomeForm({ ACCOUNTS, onAddIncome, onNotify }) {
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [rate, setRate] = useState("");
    const [account, setAccount] = useState("bbva");
    const [isSalary, setIsSalary] = useState(false);

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
            account,
            isSalary,
        });
        setAmount(""); setCurrency("MXN"); setRate(""); setAccount("bbva"); setIsSalary(false);
    };

    const segBtn = (isActive) =>
        `btn btn-sm flex-1 ${isActive ? "btn-primary" : "btn-ghost"}`;

    return (
        <section>
            {/* Título fuera del sub-panel, igual que en ExpenseForm */}
            <h2 className="text-lg sm:text-xl font-semibold mb-3 text-gray-700">
                Agregar ingreso
            </h2>

            {/* Sub-panel suave con borde, igual que en ExpenseForm */}
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

                {/* Moneda (toggle segmentado) */}
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
                    >
                        {Object.keys(ACCOUNTS).map((k) => (
                            <option key={k} value={k}>
                                {ACCOUNTS[k].name}
                            </option>
                        ))}
                    </select>
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
                <button type="submit" className="btn btn-primary w-full">
                    Agregar ingreso
                </button>
            </form>
        </section>
    );
}
