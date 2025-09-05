const fmt = (n, c = "MXN") =>
    new Intl.NumberFormat(c === "MXN" ? "es-MX" : "en-US", { style: "currency", currency: c }).format(n || 0);

export default function Strategy503020({ data }) {
    return (
        <div className="card card-padding">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center text-gray-800">
                Estrategia 50/30/20 (Salario)
            </h2>
            <p className="text-center text-gray-600 mb-6">
                Una guía para balancear tus gastos, ahorros e inversiones.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* 50% Necesidades – Mercado Pago */}
                <div className="relative rounded-xl border border-orange-200 bg-orange-50 p-4 sm:p-5 min-h-[158px]">
                    <img
                        src="/assets/logos/mercadoPago.svg"
                        alt="Mercado Pago"
                        className="absolute right-3 top-3 h-6 opacity-80"
                    />
                    <h3 className="text-base sm:text-lg font-semibold text-orange-800 mb-1">
                        50% Necesidades
                    </h3>
                    <p className="text-xs text-gray-500">Presupuesto ideal</p>
                    <p className="text-lg sm:text-xl font-bold text-orange-600">{fmt(data.needs.ideal)}</p>
                    <div className="mt-3 pt-2 text-sm space-y-1 border-t border-orange-200/60">
                        <div className="flex justify-between"><span>Gastado:</span><span className="font-semibold">{fmt(data.needs.actual)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Restante:</span><span>{fmt(data.needs.remaining)}</span></div>
                    </div>
                </div>

                {/* 30% Deseos – Dolar App */}
                <div className="relative rounded-xl border border-teal-200 bg-teal-50 p-4 sm:p-5 min-h-[158px]">
                    <img
                        src="/assets/logos/DolarApp.svg"
                        alt="Dolar App"
                        className="absolute right-3 top-3 h-6 opacity-80"
                    />
                    <h3 className="text-base sm:text-lg font-semibold text-teal-800 mb-1">
                        30% Deseos
                    </h3>
                    <p className="text-xs text-gray-500">Presupuesto ideal</p>
                    <p className="text-lg sm:text-xl font-bold text-teal-600">{fmt(data.wants.ideal)}</p>
                    <div className="mt-3 pt-2 text-sm space-y-1 border-t border-teal-200/60">
                        <div className="flex justify-between"><span>Gastado:</span><span className="font-semibold">{fmt(data.wants.actual)}</span></div>
                        <div className="flex justify-between font-semibold"><span>Restante:</span><span>{fmt(data.wants.remaining)}</span></div>
                    </div>
                </div>

                {/* 20% Futuro – BBVA */}
                <div className="relative rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5 min-h-[158px]">
                    <img
                        src="/assets/logos/BBVA.svg"
                        alt="BBVA"
                        className="absolute right-3 top-3 h-6 opacity-80"
                    />
                    <h3 className="text-base sm:text-lg font-semibold text-indigo-800 mb-1">
                        20% Futuro
                    </h3>
                    <p className="text-xs text-gray-500">Meta de ahorro ideal</p>
                    <p className="text-lg sm:text-xl font-bold text-indigo-600">{fmt(data.future.ideal)}</p>
                    <div className="mt-3 pt-2 text-sm space-y-1 border-t border-indigo-200/60">
                        <div className="flex justify-between"><span className="font-semibold">Ahorro real:</span><span className="font-semibold">{fmt(data.future.actual)}</span></div>
                        <div className="text-[11px] text-gray-500 text-right">(Ingreso - Gastos)</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
