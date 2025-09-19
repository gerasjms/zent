import React, { useMemo, useRef, useState } from "react";

const normCurrency = (c) => (c === "USD" ? "USD" : "MXN");
const toNum = (x) => {
    if (typeof x === "number") return Number.isFinite(x) ? x : 0;
    if (typeof x === "string") {
        const n = parseFloat(x.replace(/,/g, ""));
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
};
const fmt = (n, c) => {
    const cur = normCurrency(c);
    const locale = cur === "USD" ? "en-US" : "es-MX";
    return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(toNum(n));
};
const clean = (s) => {
    const v = (s ?? "").toString().trim();
    return v && v.toLowerCase() !== "nan" ? v : "";
};

// Fecha/hora helpers
const pad = (n) => String(n).padStart(2, "0");
const toInputLocal = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromInputLocal = (s) => {
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
};

export default function HistoryTable({
    ACCOUNTS,               // { slug: { name, currency, color? } }
    ACCOUNT_IDS,            // { slug: id }
    movements = [],         // seguro
    onDeleteClick,
    onCsvExport,
    onCsvImport,
    onUpdateMovement,       // (id, tipo, payload)
}) {
    const importRef = useRef(null);

    // Estado de edición
    const [editingId, setEditingId] = useState(null);
    const [editDesc, setEditDesc] = useState("");
    const [editAccount, setEditAccount] = useState("");
    const [editAmount, setEditAmount] = useState("");

    // Transferencias
    const [editFrom, setEditFrom] = useState("");
    const [editTo, setEditTo] = useState("");
    const [editAmountSent, setEditAmountSent] = useState("");
    const [editAmountReceived, setEditAmountReceived] = useState("");

    // Fecha/hora
    const [editDate, setEditDate] = useState("");

    // Resolver cuenta por id/slug/nombre
    const accountEntries = Object.entries(ACCOUNTS || {});
    const idToSlug = useMemo(() => {
        const out = {};
        if (ACCOUNT_IDS) for (const slug of Object.keys(ACCOUNT_IDS)) out[ACCOUNT_IDS[slug]] = slug;
        return out;
    }, [ACCOUNT_IDS]);

    /**
     * Devuelve { id, slug, name, currency } o null
     * Acepta: id ("ItOx..."), slug ("bbva"), nombre ("BBVA")
     */
    const resolveAccount = (key) => {
        if (!key) return null;
        const raw = String(key).trim();

        // 1) ID → slug
        const slugFromId = idToSlug[raw];
        if (slugFromId && ACCOUNTS?.[slugFromId]) {
            return { id: ACCOUNT_IDS?.[slugFromId], slug: slugFromId, ...ACCOUNTS[slugFromId] };
        }

        // 2) slug directo
        if (ACCOUNTS?.[raw]) {
            const slug = raw;
            return { id: ACCOUNT_IDS?.[slug] ?? null, slug, ...ACCOUNTS[slug] };
        }

        // 3) por nombre
        const lower = raw.toLowerCase();
        const byName = accountEntries.find(([, a]) => a?.name?.toLowerCase() === lower);
        if (byName) {
            const slug = byName[0];
            return { id: ACCOUNT_IDS?.[slug] ?? null, slug, ...byName[1] };
        }

        // 4) alias comunes
        const alias = { mercadopago: "Mercado Pago", dolarapp: "Dolar App" };
        if (alias[lower]) {
            const byAlias = accountEntries.find(([, a]) => a?.name === alias[lower]);
            if (byAlias) {
                const slug = byAlias[0];
                return { id: ACCOUNT_IDS?.[slug] ?? null, slug, ...byAlias[1] };
            }
        }
        return null;
    };

    const getAccountName = (key) => resolveAccount(key)?.name || "(cuenta desconocida)";
    const getAccountCurrency = (key) => resolveAccount(key)?.currency || "MXN";

    // Edición fila
    const beginEdit = (mov) => {
        setEditingId(mov.id);
        setEditDesc(
            clean(mov.description) ||
            clean(mov.category) ||
            clean(mov.originalText?.split("(")[0] || "") ||
            ""
        );
        setEditDate(toInputLocal(mov.timestamp));

        const isTransfer = mov.movType?.includes("Transferencia");
        if (isTransfer) {
            setEditFrom(mov.from ?? "");
            setEditTo(mov.to ?? "");
            setEditAmountSent(
                mov.amountSent != null
                    ? String(mov.amountSent)
                    : mov.movType === "Transferencia Salida"
                        ? String(toNum(mov.amount))
                        : ""
            );
            setEditAmountReceived(
                mov.amountReceived != null
                    ? String(mov.amountReceived)
                    : mov.movType === "Transferencia Entrada"
                        ? String(toNum(mov.amount))
                        : ""
            );
            setEditAccount("");
            setEditAmount("");
        } else {
            setEditAccount(mov.account ?? "");
            setEditAmount(
                mov.movType === "Ingreso"
                    ? String(toNum(mov.amount ?? mov.convertedAmount))
                    : String(toNum(mov.amount))
            );
            setEditFrom("");
            setEditTo("");
            setEditAmountSent("");
            setEditAmountReceived("");
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDesc("");
        setEditAccount("");
        setEditAmount("");
        setEditFrom("");
        setEditTo("");
        setEditAmountSent("");
        setEditAmountReceived("");
        setEditDate("");
    };

    const saveEdit = async (mov) => {
        if (!onUpdateMovement) return;

        const isTransfer = mov.movType?.includes("Transferencia");
        const payload = { description: editDesc?.trim() || null };

        // fecha/hora
        const iso = fromInputLocal(editDate);
        if (iso) payload.timestamp = iso;

        if (isTransfer) {
            if (!editFrom || !editTo) return;
            const aSent = parseFloat(editAmountSent);
            const aRecv = parseFloat(editAmountReceived);
            if (!Number.isFinite(aSent) || aSent < 0) return;
            if (!Number.isFinite(aRecv) || aRecv < 0) return;

            const fromRes = resolveAccount(editFrom);
            const toRes = resolveAccount(editTo);

            payload.from = (fromRes?.id ?? ACCOUNT_IDS?.[fromRes?.slug]) || fromRes?.slug || editFrom;
            payload.to = (toRes?.id ?? ACCOUNT_IDS?.[toRes?.slug]) || toRes?.slug || editTo;
            payload.amountSent = aSent;
            payload.amountReceived = aRecv;
            payload.currencySent = getAccountCurrency(editFrom);
            payload.currencyReceived = getAccountCurrency(editTo);
        } else {
            if (!editAccount) return;
            const amt = parseFloat(editAmount);
            if (!Number.isFinite(amt) || amt <= 0) return;

            const accRes = resolveAccount(editAccount);
            const accId = (accRes?.id ?? ACCOUNT_IDS?.[accRes?.slug]) || accRes?.slug || editAccount;

            payload.account = accId; // guardamos por ID si está
            payload.amount = amt;

            const accCur = accRes?.currency || "MXN";
            if (accCur === "MXN") {
                payload.currency = "MXN";
                payload.convertedAmount = amt;
            } else {
                payload.currency = "USD";
                // Si quieres recalcular convertedAmount aquí, agrégalo con tu API FX.
            }
        }

        await onUpdateMovement(mov.id, isTransfer ? "Transferencia" : mov.movType, payload);
        cancelEdit();
    };

    // Render
    return (
        <section className="card card-padding">
            {/* Header acciones */}
            <div className="flex flex-wrap justify-between items-center mb-5 gap-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Historial de movimientos</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Los datos se guardan en la nube (Firestore).</p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        ref={importRef}
                        type="file"
                        className="hidden"
                        accept=".csv"
                        onChange={onCsvImport}
                    />
                    <button
                        onClick={() => importRef.current?.click()}
                        className="btn btn-ghost btn-sm"
                        type="button"
                    >
                        Importar CSV
                    </button>
                    <button onClick={onCsvExport} className="btn btn-primary btn-sm" type="button">
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="mt-4 overflow-x-auto max-h-96 custom-scrollbar rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                        <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3 font-medium">Fecha</th>
                            <th className="px-4 py-3 font-medium">Tipo</th>
                            <th className="px-4 py-3 font-medium">Descripción</th>
                            <th className="px-4 py-3 font-medium">Cuenta</th>
                            <th className="px-4 py-3 font-medium text-right">Monto</th>
                            <th className="px-4 py-3 font-medium text-right">Acciones</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                        {(!Array.isArray(movements) || movements.length === 0) ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-10">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 grid place-items-center text-slate-400">ⓘ</div>
                                        <p className="mt-3 text-sm font-medium text-slate-700">No hay movimientos registrados</p>
                                        <p className="mt-1 text-xs text-slate-500">Agrega un ingreso, egreso o transferencia para verlos aquí.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            movements.map((mov) => {
                                let amountDisplay = "";
                                let colorClass = "text-slate-600";
                                let description = "—";
                                let typeText = mov.movType || "Movimiento";
                                const isTransfer = mov.movType?.includes("Transferencia");

                                const accountName = mov.account ? getAccountName(mov.account) : "—";

                                switch (mov.movType) {
                                    case "Ingreso": {
                                        colorClass = "text-emerald-600";
                                        typeText = "Ingreso";
                                        amountDisplay = `+${fmt(mov.convertedAmount, "MXN")}`;
                                        const d1 = clean(mov.description);
                                        const d2 = clean(mov.originalText?.split("(")[0] || "");
                                        description = d1 || d2 || "Ingreso";
                                        break;
                                    }
                                    case "Egreso": {
                                        colorClass = "text-rose-600";
                                        typeText = "Egreso";
                                        const cur = mov.currency || getAccountCurrency(mov.account) || "MXN";
                                        amountDisplay = `-${fmt(mov.amount, cur)}`;
                                        description = clean(mov.description) || clean(mov.category) || "Egreso";
                                        break;
                                    }
                                    case "Transferencia Salida": {
                                        colorClass = "text-slate-600";
                                        typeText = "Envío";
                                        const cur = mov.currency || getAccountCurrency(mov.from) || "MXN";
                                        amountDisplay = `-${fmt(mov.amount, cur)}`;
                                        description = clean(mov.description) || `a ${getAccountName(mov.to)}`;
                                        break;
                                    }
                                    case "Transferencia Entrada": {
                                        colorClass = "text-emerald-700";
                                        typeText = "Recepción";
                                        const cur = mov.currency || getAccountCurrency(mov.to) || "MXN";
                                        amountDisplay = `+${fmt(mov.amount, cur)}`;
                                        description = clean(mov.description) || `de ${getAccountName(mov.from)}`;
                                        break;
                                    }
                                    default: {
                                        colorClass = "text-slate-600";
                                        typeText = mov.movType || "Movimiento";
                                        amountDisplay = fmt(mov.amount, mov.currency || "MXN");
                                        description = "—";
                                    }
                                }

                                const date = mov.timestamp ? new Date(mov.timestamp) : null;
                                const dateStr =
                                    date && !Number.isNaN(date.getTime())
                                        ? date.toLocaleString("es-MX", {
                                            year: "2-digit",
                                            month: "2-digit",
                                            day: "2-digit",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })
                                        : "—";

                                const isEditing = editingId === mov.id;
                                const accountOptions = Object.keys(ACCOUNTS || {}); // slugs

                                return (
                                    <tr
                                        key={mov.tableId || mov.id}
                                        className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50 transition-colors"
                                    >
                                        {/* Fecha */}
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                            {isEditing ? (
                                                <input
                                                    type="datetime-local"
                                                    className="input input-sm"
                                                    value={editDate}
                                                    onChange={(e) => setEditDate(e.target.value)}
                                                />
                                            ) : (
                                                dateStr
                                            )}
                                        </td>

                                        {/* Tipo */}
                                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${colorClass}`}>{typeText}</td>

                                        {/* Descripción */}
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                                            {isEditing ? (
                                                <input
                                                    className="input input-sm w-56"
                                                    value={editDesc}
                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                    placeholder="Descripción"
                                                />
                                            ) : (
                                                description
                                            )}
                                        </td>

                                        {/* Cuenta */}
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                            {isEditing ? (
                                                isTransfer ? (
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={editFrom}
                                                            onChange={(e) => setEditFrom(e.target.value)}
                                                            className="select select-sm"
                                                            title="Desde"
                                                        >
                                                            {accountOptions.map((slug) => (
                                                                <option key={slug} value={slug}>
                                                                    {ACCOUNTS[slug].name} ({ACCOUNTS[slug].currency})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="text-slate-400">→</span>
                                                        <select
                                                            value={editTo}
                                                            onChange={(e) => setEditTo(e.target.value)}
                                                            className="select select-sm"
                                                            title="Hacia"
                                                        >
                                                            {accountOptions.map((slug) => (
                                                                <option key={slug} value={slug}>
                                                                    {ACCOUNTS[slug].name} ({ACCOUNTS[slug].currency})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={editAccount}
                                                        onChange={(e) => setEditAccount(e.target.value)}
                                                        className="select select-sm"
                                                    >
                                                        {accountOptions.map((slug) => (
                                                            <option key={slug} value={slug}>
                                                                {ACCOUNTS[slug].name} ({ACCOUNTS[slug].currency})
                                                            </option>
                                                        ))}
                                                    </select>
                                                )
                                            ) : (
                                                accountName
                                            )}
                                        </td>

                                        {/* Monto */}
                                        <td className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${colorClass}`}>
                                            {isEditing ? (
                                                isTransfer ? (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-500">Enviado</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="input input-sm w-24 text-right"
                                                                value={editAmountSent}
                                                                onChange={(e) => setEditAmountSent(e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-500">Recibido</span>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="input input-sm w-24 text-right"
                                                                value={editAmountReceived}
                                                                onChange={(e) => setEditAmountReceived(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="input input-sm w-28 text-right"
                                                        value={editAmount}
                                                        onChange={(e) => setEditAmount(e.target.value)}
                                                    />
                                                )
                                            ) : (
                                                amountDisplay
                                            )}
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => saveEdit(mov)}
                                                        className="btn btn-primary btn-xs"
                                                        type="button"
                                                        title="Guardar"
                                                    >
                                                        Guardar
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="btn btn-ghost btn-xs"
                                                        type="button"
                                                        title="Cancelar"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => beginEdit(mov)}
                                                        className="btn btn-ghost btn-xs text-slate-600 hover:text-slate-800"
                                                        type="button"
                                                        title="Editar"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            onDeleteClick(mov.id, mov.movType?.includes("Transferencia") ? "Transferencia" : mov.movType)
                                                        }
                                                        className="btn btn-ghost btn-xs text-rose-600 hover:text-rose-700"
                                                        type="button"
                                                        title="Eliminar"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
