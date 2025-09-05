// src/components/HistoryTable.jsx
import { useRef } from "react";

const fmt = (n, c = "MXN") =>
    new Intl.NumberFormat(c === "MXN" ? "es-MX" : "en-US", {
        style: "currency",
        currency: c,
    }).format(n || 0);

export default function HistoryTable({
    ACCOUNTS,
    movements,
    onDeleteClick,
    onCsvExport,
    onCsvImport,
}) {
    const importRef = useRef(null);

    return (
        <section className="card card-padding">
            {/* Header acciones */}
            <div className="flex flex-wrap justify-between items-center mb-5 gap-4">

                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        Historial de movimientos
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Los datos se guardan en la nube (Firestore).
                    </p>
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
                        {movements.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-4 py-10">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 grid place-items-center text-slate-400">
                                            ⓘ
                                        </div>
                                        <p className="mt-3 text-sm font-medium text-slate-700">
                                            No hay movimientos registrados
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Agrega un ingreso, egreso o transferencia para verlos aquí.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            movements.map((mov) => {
                                let amountDisplay, colorClass, description, typeText;
                                const accountName = mov.account ? ACCOUNTS[mov.account]?.name : "N/A";
                                const isTransfer = mov.movType.includes("Transferencia");

                                switch (mov.movType) {
                                    case "Ingreso":
                                        colorClass = "text-emerald-600";
                                        typeText = "Ingreso";
                                        amountDisplay = `+${fmt(mov.convertedAmount, "MXN")}`;
                                        description = mov.originalText
                                            ? mov.originalText.split("(")[0].trim()
                                            : "Ingreso";
                                        break;

                                    case "Egreso":
                                        colorClass = "text-rose-600";
                                        typeText = "Egreso";
                                        amountDisplay = `-${fmt(mov.amount, mov.currency)}`;
                                        description = mov.category;
                                        break;

                                    case "Transferencia Salida":
                                        colorClass = "text-slate-600";
                                        typeText = "Envío";
                                        amountDisplay = `-${fmt(mov.amount, mov.currency)}`;
                                        description = `a ${ACCOUNTS[mov.to]?.name || "N/A"}`;
                                        break;

                                    case "Transferencia Entrada":
                                        colorClass = "text-emerald-700";
                                        typeText = "Recepción";
                                        amountDisplay = `+${fmt(mov.amount, mov.currency)}`;
                                        description = `de ${ACCOUNTS[mov.from]?.name || "N/A"}`;
                                        break;

                                    default:
                                        colorClass = "text-slate-600";
                                        typeText = mov.movType || "Movimiento";
                                        amountDisplay = fmt(mov.amount, mov.currency);
                                        description = "—";
                                }

                                const date = new Date(mov.timestamp);
                                const dateStr = isNaN(date.getTime())
                                    ? "—"
                                    : date.toLocaleString("es-MX", {
                                        year: "2-digit",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    });

                                return (
                                    <tr
                                        key={mov.tableId}
                                        className="odd:bg-white even:bg-slate-50/40 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                            {dateStr}
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap font-medium ${colorClass}`}>
                                            {typeText}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-800">
                                            {description}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                            {accountName}
                                        </td>
                                        <td
                                            className={`px-4 py-3 whitespace-nowrap text-right font-semibold ${colorClass}`}
                                        >
                                            {amountDisplay}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-right">
                                            <button
                                                onClick={() =>
                                                    onDeleteClick(mov.id, isTransfer ? "Transferencia" : mov.movType)
                                                }
                                                className="btn btn-ghost btn-xs text-rose-600 hover:text-rose-700"
                                                type="button"
                                                title="Eliminar"
                                            >
                                                Eliminar
                                            </button>
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
