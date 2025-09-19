// src/components/AddAccountForm.jsx
import { useState } from "react";

export default function AddAccountForm({ onCreate }) {
    const [name, setName] = useState("");
    const [currency, setCurrency] = useState("MXN");
    const [submitting, setSubmitting] = useState(false);

    const segBtn = (active) =>
        `text-sm px-3 py-2 rounded-lg border transition ${active
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
        }`;

    const submit = async (e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n || submitting) return;
        try {
            setSubmitting(true);
            await onCreate({ name: n, currency });
            setName("");
            setCurrency("MXN");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={submit}
            className="mt-4 bg-slate-50 border border-slate-200 p-3 md:p-4 rounded-xl"
        >
            {/* 1) Nombre (fila 1) */}
            <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nombre de la cuenta
                </label>
                <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="BBVA, Mercado Pago, Efectivo…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            {/* 2) Moneda (fila 2) */}
            <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                    Moneda
                </label>

                {/* Segmented control full-width */}
                <div
                    role="group"
                    aria-label="Seleccionar moneda"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-1 flex"
                >
                    {/* Izquierda: MXN (bordes externos redondeados) */}
                    <button
                        type="button"
                        onClick={() => setCurrency("MXN")}
                        className={[
                            "flex-1 px-3 py-2 text-sm font-medium transition",
                            "rounded-l-xl",                 // solo borde externo
                            currency === "MXN"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-transparent text-slate-700 hover:bg-white"
                        ].join(" ")}
                    >
                        MXN
                    </button>

                    {/* Derecha: USD (bordes externos redondeados) */}
                    <button
                        type="button"
                        onClick={() => setCurrency("USD")}
                        className={[
                            "flex-1 px-3 py-2 text-sm font-medium transition",
                            "rounded-r-xl",                 // solo borde externo
                            currency === "USD"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-transparent text-slate-700 hover:bg-white"
                        ].join(" ")}
                    >
                        USD
                    </button>
                </div>
            </div>


            {/* 3) Botón (fila 3) */}
            <button
                className="w-full rounded-xl bg-blue-600 text-white font-medium py-2 hover:bg-blue-700 transition disabled:opacity-60"
                type="submit"
                disabled={!name.trim() || submitting}
            >
                {submitting ? "Agregando..." : "Agregar cuenta"}
            </button>
        </form>
    );
}
