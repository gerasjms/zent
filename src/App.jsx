// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "./components/Header.jsx";
import Notification from "./components/Notification.jsx";
import IncomeForm from "./components/IncomeForm.jsx";
import ExpenseForm from "./components/ExpenseForm.jsx";
import TransferForm from "./components/TransferForm.jsx";
import AccountBalances from "./components/AccountBalances.jsx";
import FinanceChart from "./components/FinanceChart.jsx";
import Strategy503020 from "./components/Strategy503020.jsx";
import HistoryTable from "./components/HistoryTable.jsx";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal.jsx";

import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setLogLevel,
} from "firebase/firestore";

// --- Config ---
const API_URL_USD_TO_MXN = "https://open.er-api.com/v6/latest/USD";
const APP_ID = import.meta?.env?.VITE_APP_ID || "zent-app";

export const ACCOUNTS = {
  bbva: { name: "BBVA", currency: "MXN", color: "indigo" },
  mercadoPago: { name: "Mercado Pago", currency: "MXN", color: "orange" },
  dolarApp: { name: "Dolar App", currency: "USD", color: "teal" },
  efectivo: { name: "Efectivo", currency: "MXN", color: "green" },
  edenred: { name: "Edenred", currency: "MXN", color: "red" },
};

export const CATEGORIES = {
  "Movimientos entre Cuentas": { type: "transfer", items: ["Retiro de Efectivo"] },
  Necesidades: {
    type: "need",
    items: [
      "Renta / Hipoteca",
      "Servicios (Luz, Agua, Gas)",
      "Supermercado",
      "Transporte Público",
      "Gasolina",
      "Salud (Seguro, Medicinas)",
      "Psicólogo",
      "Educación Esencial",
    ],
  },
  "Deseos / Ocio": {
    type: "want",
    items: [
      "Restaurantes / Cafés",
      "Suscripciones (Streaming)",
      "Cine / Eventos",
      "Compras (Ropa, Gadgets)",
      "Viajes / Vacaciones",
      "Hobbies",
      "Gimnasio",
    ],
  },
  Ahorro: { type: "saving", items: ["Fondo de Emergencia", "Ahorro para Metas (Auto, Casa)"] },
  Inversión: { type: "investment", items: ["Acciones / Fondos", "Criptomonedas", "Plan de Retiro"] },
  Deudas: { type: "debt", items: ["Pago Tarjeta de Crédito", "Pago Préstamo Personal"] },
};

const fmt = (n, c = "MXN") =>
  new Intl.NumberFormat(c === "MXN" ? "es-MX" : "en-US", {
    style: "currency",
    currency: c,
  }).format(n || 0);

export default function App() {
  // Datos
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // UI
  const [chartView, setChartView] = useState("strategy");
  const [itemToDelete, setItemToDelete] = useState(null);
  const [notification, setNotification] = useState({ message: "", type: "" });

  // Firebase
  const [userId, setUserId] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // Auth: solo escuchar (AuthGate se encarga del login)
  useEffect(() => {
    setLogLevel("debug");
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setIsFirebaseReady(true);
        console.log("Auth OK:", user.uid, "APP_ID:", APP_ID);
      } else {
        setUserId(null);
        setIsFirebaseReady(false);
      }
    });
    return () => unsub();
  }, []);

  // Listeners
  useEffect(() => {
    if (!isFirebaseReady || !db || !userId) return;

    const incomesRef = collection(db, "artifacts", APP_ID, "users", userId, "incomes");
    const expensesRef = collection(db, "artifacts", APP_ID, "users", userId, "expenses");
    const transfersRef = collection(db, "artifacts", APP_ID, "users", userId, "transfers");

    const u1 = onSnapshot(incomesRef, (snap) =>
      setIncomes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u2 = onSnapshot(expensesRef, (snap) =>
      setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const u3 = onSnapshot(transfersRef, (snap) =>
      setTransfers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      u1();
      u2();
      u3();
    };
  }, [isFirebaseReady, userId]);

  const showNotification = (message, type = "success", duration = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), duration);
  };

  // Escrituras
  const handleAddIncome = async ({ amount, currency, manualRate, account, isSalary }) => {
    if (!isFirebaseReady || !userId)
      return showNotification("La base de datos no está lista.", "error");
    let convertedAmount = amount;
    let rateUsed = null;
    let originalAmountText = `${fmt(amount, currency)}`;

    if (currency === "USD") {
      rateUsed = manualRate;
      if (!rateUsed || rateUsed <= 0) {
        try {
          const res = await fetch(API_URL_USD_TO_MXN);
          const data = await res.json();
          rateUsed = data?.rates?.MXN;
          if (!rateUsed) throw new Error("Tipo de cambio inválido");
        } catch {
          showNotification("No se pudo obtener el tipo de cambio automático.", "error");
          return;
        }
      }
      convertedAmount = amount * rateUsed;
      originalAmountText = `${fmt(amount, "USD")} (@${rateUsed.toFixed(4)})`;
    }

    const docData = {
      timestamp: new Date().toISOString(),
      amount,
      currency,
      convertedAmount,
      originalText: originalAmountText,
      account,
      isSalary,
      rateUsed,
    };

    try {
      await addDoc(collection(db, "artifacts", APP_ID, "users", userId, "incomes"), docData);
      showNotification("Ingreso agregado correctamente.");
    } catch (e) {
      console.error("add income", e);
      showNotification("Error al guardar el ingreso.", "error");
    }
  };

  const handleAddExpense = async ({ amount, currency, category, account }) => {
    if (!isFirebaseReady || !userId)
      return showNotification("La base de datos no está lista.", "error");
    let convertedAmount = amount;

    if (currency === "USD") {
      try {
        const res = await fetch(API_URL_USD_TO_MXN);
        const data = await res.json();
        const rate = data?.rates?.MXN;
        if (!rate) throw new Error("Invalid exchange rate");
        convertedAmount = amount * rate;
      } catch {
        return showNotification("No se pudo obtener el tipo de cambio (USD).", "error");
      }
    }

    const group = Object.keys(CATEGORIES).find((g) => CATEGORIES[g].items.includes(category));
    const docData = {
      timestamp: new Date().toISOString(),
      amount,
      currency,
      convertedAmount,
      category,
      account,
      type: CATEGORIES[group]?.type,
      group,
    };

    try {
      if (docData.category === "Retiro de Efectivo" && docData.account !== "efectivo") {
        const newTransfer = {
          timestamp: new Date().toISOString(),
          from: docData.account,
          to: "efectivo",
          amountSent: amount,
          currencySent: "MXN",
          amountReceived: amount,
          currencyReceived: "MXN",
          spread: 0,
          isWithdrawal: true,
        };
        await addDoc(collection(db, "artifacts", APP_ID, "users", userId, "transfers"), newTransfer);
        showNotification("Retiro de efectivo registrado como transferencia.");
      } else {
        await addDoc(collection(db, "artifacts", APP_ID, "users", userId, "expenses"), docData);
        showNotification("Egreso agregado correctamente.");
      }
    } catch (e) {
      console.error("add expense", e);
      showNotification("Error al guardar el egreso.", "error");
    }
  };

  const handleAddTransfer = async ({ from, to, amountSent, rate, amountReceived, spread }) => {
    if (!isFirebaseReady || !userId)
      return showNotification("La base de datos no está lista.", "error");
    const docData = {
      timestamp: new Date().toISOString(),
      from,
      to,
      amountSent,
      currencySent: ACCOUNTS[from].currency,
      amountReceived: amountReceived || amountSent,
      currencyReceived: ACCOUNTS[to].currency,
      spread: spread || 0,
      rate: rate || null,
    };

    try {
      await addDoc(collection(db, "artifacts", APP_ID, "users", userId, "transfers"), docData);
      showNotification("Transferencia registrada con éxito.");
    } catch (e) {
      console.error("add transfer", e);
      showNotification("Error al guardar la transferencia.", "error");
    }
  };

  const handleDeleteItem = async () => {
    const { id, type } = itemToDelete || {};
    if (!isFirebaseReady || !id || !userId)
      return showNotification("No se puede eliminar el item.", "error");
    const coll =
      type === "Ingreso" ? "incomes" : type === "Egreso" ? "expenses" : type === "Transferencia" ? "transfers" : "";
    if (!coll) return;

    try {
      await deleteDoc(doc(db, "artifacts", APP_ID, "users", userId, coll, id));
      setItemToDelete(null);
      showNotification("Movimiento eliminado.");
    } catch (e) {
      console.error("delete", e);
      showNotification("Error al eliminar el movimiento.", "error");
    }
  };

  // Cálculos
  const { balances, totalBalance } = useMemo(() => {
    const b = {};
    for (const k in ACCOUNTS) b[k] = { balance: 0 };

    incomes.forEach((inc) => {
      if (inc.account && ACCOUNTS[inc.account]) {
        if (ACCOUNTS[inc.account].currency === "USD" && inc.currency === "USD")
          b[inc.account].balance += Number(inc.amount) || 0;
        else if (ACCOUNTS[inc.account].currency === "MXN")
          b[inc.account].balance += Number(inc.convertedAmount) || 0;
      }
    });
    expenses.forEach((exp) => {
      if (exp.account && ACCOUNTS[exp.account]) b[exp.account].balance -= Number(exp.amount) || 0;
    });
    transfers.forEach((t) => {
      if (t.from && b[t.from]) b[t.from].balance -= Number(t.amountSent) || 0;
      if (t.to && b[t.to]) b[t.to].balance += Number(t.amountReceived) || 0;
    });

    // Para el total general en MXN usamos una tasa aproximada fija
    const approx = 17.0;
    const total = Object.keys(b).reduce((sum, k) => {
      const cur = ACCOUNTS[k].currency;
      const val = b[k].balance;
      return sum + (cur === "USD" ? val * approx : val);
    }, 0);

    return { balances: b, totalBalance: total };
  }, [incomes, expenses, transfers]);

  const { totalSalaryIncome, totalGlobalIncome, strategyData } = useMemo(() => {
    const salaryIncomes = incomes.filter((i) => i.isSalary);
    const totalSalary = salaryIncomes.reduce((s, i) => s + (i.convertedAmount || 0), 0);
    const totalGlobal = incomes.reduce((s, i) => s + (i.convertedAmount || 0), 0);

    const strategyExpenses = expenses.filter((e) => e.account !== "efectivo" && e.account !== "edenred");
    const sumType = (t) =>
      strategyExpenses
        .filter((e) => e.type === t)
        .reduce((s, e) => s + (e.convertedAmount ?? e.amount), 0);

    const totalNeeds = sumType("need") + sumType("transfer");
    const totalWants = sumType("want");
    const totalStrategyExpenses = strategyExpenses.reduce(
      (s, e) => s + (e.convertedAmount ?? e.amount),
      0
    );

    return {
      totalSalaryIncome: totalSalary,
      totalGlobalIncome: totalGlobal,
      strategyData: {
        needs: { ideal: totalSalary * 0.5, actual: totalNeeds, remaining: totalSalary * 0.5 - totalNeeds },
        wants: { ideal: totalSalary * 0.3, actual: totalWants, remaining: totalSalary * 0.3 - totalWants },
        future: { ideal: totalSalary * 0.2, actual: totalSalary - totalStrategyExpenses },
      },
    };
  }, [incomes, expenses]);

  // Config de la gráfica (prop `data` y `options`)
  const chartConfig = useMemo(() => {
    const totalIncome = chartView === "strategy" ? totalSalaryIncome : totalGlobalIncome;
    const expensesToChart =
      chartView === "strategy"
        ? expenses.filter((e) => e.account !== "efectivo" && e.account !== "edenred")
        : expenses;
    const remainingLabel = chartView === "strategy" ? "Salario Restante" : "Ingreso Restante";

    if (!Number.isFinite(totalIncome) || totalIncome <= 0) {
      return {
        data: {
          labels: ["Sin Ingresos"],
          datasets: [
            { data: [1], backgroundColor: ["#e5e7eb"], borderColor: "#fff", borderWidth: 2 },
          ],
        },
        options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false },
      };
    }

    const grouped = expensesToChart.reduce((acc, exp) => {
      const g = exp.group || "Otros";
      acc[g] = (acc[g] || 0) + (exp.convertedAmount ?? exp.amount ?? 0);
      return acc;
    }, {});
    const totalChart = Object.values(grouped).reduce((s, v) => s + v, 0);
    const remaining = Math.max(0, totalIncome - totalChart);

    const labels = [remainingLabel, ...Object.keys(grouped)];
    const dataVals = [remaining, ...Object.values(grouped)];
    const colorMap = {
      "Salario Restante": "#4ade80",
      "Ingreso Restante": "#4ade80",
      Necesidades: "#fb923c",
      "Deseos / Ocio": "#2dd4bf",
      Ahorro: "#60a5fa",
      Inversión: "#a78bfa",
      Deudas: "#f472b6",
      "Movimientos entre Cuentas": "#9ca3af",
    };
    const backgroundColor = labels.map((l) => colorMap[l] || "#cccccc");

    return {
      data: {
        labels,
        datasets: [{ data: dataVals, backgroundColor, borderColor: "#ffffff", borderWidth: 2 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.label}: ${new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(c.parsed)}`,
            },
          },
        },
      },
    };
  }, [chartView, totalSalaryIncome, totalGlobalIncome, expenses]);

  // Movimientos combinados
  const allMovements = useMemo(() => {
    return [
      ...incomes.map((i) => ({ ...i, movType: "Ingreso", tableId: `inc-${i.id}` })),
      ...expenses.map((e) => ({ ...e, movType: "Egreso", tableId: `exp-${e.id}` })),
      ...transfers.flatMap((t) => [
        {
          ...t,
          movType: "Transferencia Salida",
          amount: t.amountSent,
          currency: t.currencySent,
          account: t.from,
          tableId: `t-${t.id}-out`,
        },
        {
          ...t,
          movType: "Transferencia Entrada",
          amount: t.amountReceived,
          currency: t.currencyReceived,
          account: t.to,
          tableId: `t-${t.id}-in`,
        },
      ]),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [incomes, expenses, transfers]);

  // CSV
  const handleCsvExport = () => {
    const headers = [
      "type",
      "id",
      "timestamp",
      "account",
      "amount",
      "currency",
      "convertedAmount",
      "rateUsed",
      "isSalary",
      "originalText",
      "category",
      "group",
      "from",
      "to",
      "amountSent",
      "currencySent",
      "amountReceived",
      "currencyReceived",
      "spread",
    ];
    const esc = (s) => `"${(s ?? "").toString().replace(/"/g, '""')}"`;
    const rows = [
      ...incomes.map((inc) => ({ type: "income", ...inc })),
      ...expenses.map((exp) => ({ type: "expense", ...exp })),
      ...transfers.map((t) => ({ type: "transfer", ...t })),
    ];
    if (!rows.length) return showNotification("No hay datos para exportar.", "error");
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "historial_financiero.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCsvImport = (e) => {
    const file = e.target.files?.[0];
    if (!file || !isFirebaseReady || !userId) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
        const parseNum = (v) =>
          v && v.trim() !== "" && v !== "null" ? parseFloat(v) : null;

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
          const row = headers.reduce((o, h, idx) => {
            o[h] = (values[idx] ?? "").replace(/"/g, "");
            return o;
          }, {});

          if (row.type === "income") {
            const newIncome = {
              ...row,
              amount: parseNum(row.amount),
              convertedAmount: parseNum(row.convertedAmount),
              rateUsed: parseNum(row.rateUsed),
              isSalary: row.isSalary === "true",
            };
            await addDoc(
              collection(db, "artifacts", APP_ID, "users", userId, "incomes"),
              newIncome
            );
          } else if (row.type === "expense") {
            const newExpense = {
              ...row,
              amount: parseNum(row.amount),
              convertedAmount: parseNum(row.convertedAmount),
            };
            await addDoc(
              collection(db, "artifacts", APP_ID, "users", userId, "expenses"),
              newExpense
            );
          } else if (row.type === "transfer") {
            const newTransfer = {
              ...row,
              amountSent: parseNum(row.amountSent),
              amountReceived: parseNum(row.amountReceived),
              spread: parseNum(row.spread),
            };
            await addDoc(
              collection(db, "artifacts", APP_ID, "users", userId, "transfers"),
              newTransfer
            );
          }
        }
        showNotification("¡Datos importados correctamente!");
      } catch (err) {
        console.error("CSV import error", err);
        showNotification("Error al procesar el archivo CSV.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Render
  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans p-4 lg:p-8">
      <Notification
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ message: "", type: "" })}
      />
      <DeleteConfirmationModal
        item={itemToDelete}
        onConfirm={handleDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />

      <div className="w-full lg:w-4/5 mx-auto">
        <Header />
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <aside className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-lg flex flex-col self-start">
            <IncomeForm
              ACCOUNTS={ACCOUNTS}
              onAddIncome={handleAddIncome}
              onNotify={showNotification}
            />
            <ExpenseForm
              ACCOUNTS={ACCOUNTS}
              CATEGORIES={CATEGORIES}
              onAddExpense={handleAddExpense}
              onNotify={showNotification}
            />
            <AccountBalances
              ACCOUNTS={ACCOUNTS}
              balances={balances}
              totalBalance={totalBalance}
            />
          </aside>

          <section className="lg:col-span-2 flex flex-col gap-8">
            <FinanceChart
              data={chartConfig.data}
              options={chartConfig.options}
              chartView={chartView}
              setChartView={setChartView}
              totalSalaryIncome={totalSalaryIncome}
              totalGlobalIncome={totalGlobalIncome}
            />
            <TransferForm
              ACCOUNTS={ACCOUNTS}
              onAddTransfer={handleAddTransfer}
              onNotify={showNotification}
            />
            <Strategy503020 data={strategyData} />
            <HistoryTable
              ACCOUNTS={ACCOUNTS}
              movements={allMovements}
              onDeleteClick={(id, type) => setItemToDelete({ id, type })}
              onCsvExport={handleCsvExport}
              onCsvImport={handleCsvImport}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
