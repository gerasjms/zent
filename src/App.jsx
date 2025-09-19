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
import AddAccountForm from "./components/AddAccountForm.jsx";

import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  setLogLevel,
} from "firebase/firestore";

// === DEBUG TOGGLE ===
const DEBUG =
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug")) ||
  (import.meta?.env?.DEV ?? false);

const dlog = (...args) => { if (DEBUG) console.log("[DBG]", ...args); };
const dtable = (label, rows) => { if (DEBUG && rows?.length) { console.log(`[DBG] ${label}`); console.table(rows); } };

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

// IDs reales (slug → id)
const ACCOUNT_IDS = {
  efectivo: "1gP5BBo2yT4EgbDOo2K7",
  mercadoPago: "HjQe1u3k7c5yR5FudUdA",
  bbva: "ItOx95vKThYE8qpJmczJ",
  dolarApp: "3dmzvUbX0fQKVaR2Kbel",
  edenred: "szb7ZPAt2PTS8apHIUai",
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
  }).format(Number.isFinite(n) ? n : 0);

// ===== Util fechas =====
const inRange = (iso, startISO, endISO) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const afterStart = startISO ? t >= new Date(startISO).getTime() : true;
  const beforeEnd = endISO ? t <= (new Date(endISO).getTime() + 86399999) : true;
  return afterStart && beforeEnd;
};

// ===== normalización de cuentas (id/slug/nombre → slug) =====
const toSlugFactory = (accountsMapLocal, accountIdsLocal) => {
  const idToSlug = {};
  for (const s of Object.keys(accountIdsLocal || {})) idToSlug[accountIdsLocal[s]] = s;
  const nameToSlug = {};
  for (const [slug, a] of Object.entries(accountsMapLocal || {})) {
    if (a?.name) nameToSlug[a.name.toLowerCase()] = slug;
  }
  const alias = { mercadopago: "mercadoPago", dolarapp: "dolarApp" };

  return function toSlug(key) {
    if (!key) return null;
    const raw = String(key).trim();
    if (idToSlug[raw]) return idToSlug[raw];           // id → slug
    if (accountsMapLocal?.[raw]) return raw;           // slug → slug
    const lower = raw.toLowerCase();
    if (nameToSlug[lower]) return nameToSlug[lower];   // nombre → slug
    if (alias[lower]) return alias[lower];             // alias → slug
    return null;
  };
};

export default function App() {

  const [displayCurrency, setDisplayCurrency] = useState("MXN");

  // Convierte MXN → moneda seleccionada para mostrar
  const mxToDisplay = (mxn) => {
    const r = Number(usdToMxn) || 17.0;
    return displayCurrency === "USD" ? (Number(mxn) || 0) / r : (Number(mxn) || 0);
  };

  // Formatea usando la moneda seleccionada
  const fmtDisp = (mxn) => fmt(mxToDisplay(mxn), displayCurrency);

  // Estrategia editable (recomendada por default)
  const [strategy, setStrategy] = useState({
    needs: { pct: 50, account: "mercadoPago" },
    wants: { pct: 30, account: "dolarApp" },
    future: { pct: 20, account: "bbva" },
  });

  // Tasa USD→MXN
  const [usdToMxn, setUsdToMxn] = useState(17.0);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_URL_USD_TO_MXN);
        const data = await res.json();
        if (data?.rates?.MXN) setUsdToMxn(data.rates.MXN);
      } catch {
        // deja 17.0
      }
    })();
  }, []);

  const handleCreateAccount = async ({ name, currency }) => {
    if (!isFirebaseReady || !userId) {
      showNotification("La base de datos no está lista.", "error");
      return;
    }

    const currencySafe = (currency || "MXN").toUpperCase();
    const slug = makeSlug(name, accountsMap);
    if (!slug) {
      showNotification("Nombre de cuenta inválido.", "error");
      return;
    }

    // Evita duplicados por nombre/slug
    if (accountsMap[slug]) {
      showNotification("Ya existe una cuenta con ese nombre.", "error");
      return;
    }

    try {
      await addDoc(
        collection(db, "artifacts", APP_ID, "users", userId, "accounts"),
        { slug, name: name.trim(), currency: currencySafe }
      );
      showNotification("Cuenta creada.");
    } catch (e) {
      console.error("create account", e);
      showNotification("No se pudo crear la cuenta.", "error");
    }
  };


  // cuentas dinámicas (slug -> { name, currency }) e ids (slug -> docId)
  const [accountsMap, setAccountsMap] = useState(ACCOUNTS);
  const [accountIds, setAccountIds] = useState(ACCOUNT_IDS);

  // Datos
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);

  // UI
  const [chartView, setChartView] = useState("strategy");
  const [itemToDelete, setItemToDelete] = useState(null);
  const [notification, setNotification] = useState({ message: "", type: "" });

  // Filtro por fechas
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Firebase
  const [userId, setUserId] = useState(null);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  // Helpers cuentas (usar mapa/ids actuales)
  const toSlug = useMemo(
    () => toSlugFactory(accountsMap, accountIds),
    [accountsMap, accountIds]
  );

  // Cuentas snapshot
  useEffect(() => {
    if (!isFirebaseReady || !db || !userId) return;
    dlog("Snapshot cuentas: suscribiendo…");

    const ref = collection(db, "artifacts", APP_ID, "users", userId, "accounts");
    const unsub = onSnapshot(ref, (snap) => {
      const dyn = {}, ids = {};
      snap.forEach((d) => {
        const { slug, name, currency } = d.data() || {};
        if (slug && name && currency) {
          dyn[slug] = { name, currency };
          ids[slug] = d.id;
        }
      });
      dlog("Snapshot cuentas:", { count: snap.size, dyn, ids });
      setAccountsMap({ ...ACCOUNTS, ...dyn });
      setAccountIds((prev) => ({ ...prev, ...ids }));
    }, (err) => dlog("Snapshot cuentas ERROR", err));

    return () => unsub();
  }, [isFirebaseReady, userId]);

  // Auth
  useEffect(() => {
    setLogLevel("debug");
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        dlog("Auth OK", { uid: user.uid, APP_ID });
        setUserId(user.uid);
        setIsFirebaseReady(true);
      } else {
        dlog("Auth: usuario no autenticado");
        setUserId(null);
        setIsFirebaseReady(false);
      }
    });
    return () => unsub();
  }, []);

  // Movimientos snapshots
  useEffect(() => {
    if (!isFirebaseReady || !db || !userId) return;
    dlog("Snapshots movimientos: suscribiendo…");

    const incomesRef = collection(db, "artifacts", APP_ID, "users", userId, "incomes");
    const expensesRef = collection(db, "artifacts", APP_ID, "users", userId, "expenses");
    const transfersRef = collection(db, "artifacts", APP_ID, "users", userId, "transfers");

    const u1 = onSnapshot(incomesRef, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      dtable("Incomes", rows);
      setIncomes(rows);
    });
    const u2 = onSnapshot(expensesRef, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      dtable("Expenses", rows);
      setExpenses(rows);
    });
    const u3 = onSnapshot(transfersRef, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      dtable("Transfers", rows);
      setTransfers(rows);
    });

    return () => { u1(); u2(); u3(); };
  }, [isFirebaseReady, userId]);

  const showNotification = (message, type = "success", duration = 3000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "" }), duration);
  };

  // Escrituras
  const handleAddIncome = async ({ amount, currency, manualRate, account, isSalary }) => {
    if (!isFirebaseReady || !userId)
      return showNotification("La base de datos no está lista.", "error");

    const accSlug = toSlug(account) || account;

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
      account: accSlug,
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

    const accSlug = toSlug(account) || account;

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
      account: accSlug,
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

    const fromSlug = toSlug(from) || from;
    const toSlugVal = toSlug(to) || to;

    const docData = {
      timestamp: new Date().toISOString(),
      from: fromSlug,
      to: toSlugVal,
      amountSent,
      currencySent: accountsMap[fromSlug]?.currency || "MXN",
      amountReceived: amountReceived || amountSent,
      currencyReceived: accountsMap[toSlugVal]?.currency || "MXN",
      spread: spread || 0,
      rate: rate || null,
    };

    try {
      await addDoc(collection(db, "artifacts", APP_ID, "users", userId, "transfers"), docData);
      showNotification("Transferencia registrado con éxito.");
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

  // Actualizar movimientos (edición desde historial)
  const handleUpdateMovement = async (id, movType, payload) => {
    if (!isFirebaseReady || !userId) return;
    const coll =
      movType === "Ingreso" ? "incomes" : movType === "Egreso" ? "expenses" : movType === "Transferencia" ? "transfers" : "";
    if (!coll) return;

    // Normaliza cuenta si viene en payload
    if (payload?.account) {
      const normalized = toSlug(payload.account) || payload.account;
      payload.account = normalized;
    }
    if (payload?.from) payload.from = toSlug(payload.from) || payload.from;
    if (payload?.to) payload.to = toSlug(payload.to) || payload.to;

    try {
      await updateDoc(doc(db, "artifacts", APP_ID, "users", userId, coll, id), payload);
      showNotification("Movimiento actualizado.");
    } catch (e) {
      console.error("update", e);
      showNotification("Error al actualizar el movimiento.", "error");
    }
  };

  // ===== FILTRADO por fechas =====
  const filtered = useMemo(() => {
    const startISO = startDate ? new Date(startDate).toISOString() : null;
    const endISO = endDate ? new Date(endDate).toISOString() : null;

    const inc = incomes.filter((i) => inRange(i.timestamp, startISO, endISO));
    const exp = expenses.filter((e) => inRange(e.timestamp, startISO, endISO));
    const tra = transfers.filter((t) => inRange(t.timestamp, startISO, endISO));

    return { inc, exp, tra };
  }, [incomes, expenses, transfers, startDate, endDate]);

  const srcIncomes = startDate || endDate ? filtered.inc : incomes;
  const srcExpenses = startDate || endDate ? filtered.exp : expenses;
  const srcTransfers = startDate || endDate ? filtered.tra : transfers;

  // ===== BALANCES por cuenta (desde historial filtrado) =====
  const { balances, totalBalanceMx, totalSpentMx } = useMemo(() => {
    // Inicializa saldos por slug
    const b = {};
    for (const k in accountsMap) b[k] = { balance: 0 };

    // Ingresos suman en su cuenta (MXN usa convertedAmount si está; USD en cuentas USD usa amount)
    srcIncomes.forEach((inc) => {
      const acc = toSlug(inc.account);
      if (!acc || !accountsMap[acc]) return;
      const curAcc = accountsMap[acc].currency;
      if (curAcc === "USD" && inc.currency === "USD") {
        b[acc].balance += Number(inc.amount) || 0;
      } else {
        b[acc].balance += Number(inc.convertedAmount ?? inc.amount) || 0;
      }
    });

    // Egresos restan en la cuenta (asumimos amount en moneda de la cuenta)
    srcExpenses.forEach((exp) => {
      const acc = toSlug(exp.account);
      if (!acc || !accountsMap[acc]) return;
      b[acc].balance -= Number(exp.amount) || 0;
    });

    // Transferencias mueven entre cuentas
    srcTransfers.forEach((t) => {
      const from = toSlug(t.from);
      const to = toSlug(t.to);
      if (from && b[from]) b[from].balance -= Number(t.amountSent ?? t.amount) || 0;
      if (to && b[to]) b[to].balance += Number(t.amountReceived ?? t.amount) || 0;
    });

    // total aprox a MXN con la tasa dinámica
    const approx = Number(usdToMxn) || 17.0;
    const totalMx = Object.keys(b).reduce((sum, k) => {
      const cur = accountsMap[k].currency;
      const val = b[k].balance;
      return sum + (cur === "USD" ? val * approx : val);
    }, 0);

    const spentMx = srcExpenses.reduce((sum, e) => {
      const acc = toSlug(e.account);
      const cur = e.currency || (acc ? accountsMap[acc]?.currency : "MXN");
      const val = Number(e.amount) || 0;
      return sum + (cur === "USD" ? val * approx : val);
    }, 0);

    return { balances: b, totalBalanceMx: totalMx, totalSpentMx: spentMx };
  }, [srcIncomes, srcExpenses, srcTransfers, accountsMap, toSlug, usdToMxn]);

  // ===== Helpers de conversión a MXN (reutilizables) =====
  const toMx = (amount, currency, rateUsed, liveRate) => {
    const n = Number(amount) || 0;
    const cur = String(currency || "MXN").toUpperCase();
    if (cur === "USD") return n * (Number(rateUsed) || Number(liveRate) || 17.0);
    return n;
  };

  const incomeToMx = (i, liveRate) =>
    Number.isFinite(Number(i?.convertedAmount)) && Number(i.convertedAmount) > 0
      ? Number(i.convertedAmount)
      : toMx(i?.amount, i?.currency, i?.rateUsed, liveRate);

  const expenseToMx = (e, liveRate) =>
    Number.isFinite(Number(e?.convertedAmount)) && Number(e.convertedAmount) > 0
      ? Number(e.convertedAmount)
      : toMx(e?.amount, e?.currency, e?.rateUsed, liveRate);

  // ===== ESTRATEGIA editable (todo en MXN) =====
  const {
    totalSalaryIncome,
    totalGlobalIncome,
    strategyData,
    periodsInfo,
  } = useMemo(() => {
    // ingresos del rango filtrado
    const salaryIncomes = srcIncomes.filter(i => i.isSalary === true || i.isSalary === "true");

    // totales en MXN
    const totalSalary = salaryIncomes.reduce((s, i) => s + incomeToMx(i, usdToMxn), 0);
    const totalGlobal = srcIncomes.reduce((s, i) => s + incomeToMx(i, usdToMxn), 0);

    // cuentas objetivo (normalizadas a slug)
    const needsAcc = toSlug(strategy?.needs?.account) || strategy?.needs?.account || null;
    const wantsAcc = toSlug(strategy?.wants?.account) || strategy?.wants?.account || null;

    // gastos por bucket: tipo + **cuenta coincide con la seleccionada en el bucket**
    const spentNeeds = srcExpenses
      .filter(e => e.type === "need" && (toSlug(e.account) || e.account) === needsAcc)
      .reduce((s, e) => s + expenseToMx(e, usdToMxn), 0);

    const spentWants = srcExpenses
      .filter(e => e.type === "want" && (toSlug(e.account) || e.account) === wantsAcc)
      .reduce((s, e) => s + expenseToMx(e, usdToMxn), 0);

    // % configurados
    const pNeeds = Number(strategy?.needs?.pct) || 0;
    const pWants = Number(strategy?.wants?.pct) || 0;
    const pFuture = Number(strategy?.future?.pct) || 0;

    // ideales en MXN
    const needsIdeal = totalSalary * (pNeeds / 100);
    const wantsIdeal = totalSalary * (pWants / 100);
    const futureIdeal = totalSalary * (pFuture / 100);

    // FUTURO: lo que realmente queda del salario tras **los gastos de los buckets seleccionados**
    const remainingSalary = Math.max(0, totalSalary - (spentNeeds + spentWants));

    // Para que el card muestre coherente "Gastado" y "Restante" también en Futuro:
    // - Gastado en Futuro = si el salario remanente no alcanza el ideal, la diferencia
    // - Restante en Futuro = lo que sí puedes destinar (acotado por el ideal)
    const futureSpent = Math.max(0, futureIdeal - remainingSalary);
    const futureRemaining = Math.max(0, futureIdeal - futureSpent); // equivale a Math.min(futureIdeal, remainingSalary)

    // periodización
    let periods = salaryIncomes.length || 1;
    if (salaryIncomes.length === 0) {
      const hasRange = !!(startDate || endDate);
      if (hasRange) {
        const sd = startDate
          ? new Date(startDate).getTime()
          : (srcIncomes[0]?.timestamp ? new Date(srcIncomes[0].timestamp).getTime() : Date.now());
        const ed = endDate ? new Date(endDate).getTime() : Date.now();
        const days = Math.max(1, Math.ceil((ed - sd) / (1000 * 60 * 60 * 24)));
        periods = Math.max(1, Math.ceil(days / 14));
      }
    }

    // DEBUG opcional
    dtable("Salary incomes (→MXN)", salaryIncomes.map(i => ({
      id: i.id, currency: i.currency, amount: i.amount, convertedAmount: i.convertedAmount,
      rateUsed: i.rateUsed, toMx: incomeToMx(i, usdToMxn)
    })));
    dlog("Buckets", { needsAcc, wantsAcc, spentNeeds, spentWants, remainingSalary, futureSpent, futureRemaining });

    return {
      totalSalaryIncome: totalSalary,
      totalGlobalIncome: totalGlobal,
      strategyData: {
        // En los tres buckets: actual = lo gastado; remaining = ideal - gastado
        needs: { ideal: needsIdeal, actual: spentNeeds, remaining: Math.max(0, needsIdeal - spentNeeds) },
        wants: { ideal: wantsIdeal, actual: spentWants, remaining: Math.max(0, wantsIdeal - spentWants) },
        future: { ideal: futureIdeal, actual: futureSpent, remaining: futureRemaining },
      },
      periodsInfo: {
        periods,
        perPeriod: {
          needs: periods ? needsIdeal / periods : 0,
          wants: periods ? wantsIdeal / periods : 0,
          future: periods ? futureIdeal / periods : 0,
        },
      },
    };
  }, [srcIncomes, srcExpenses, startDate, endDate, strategy, usdToMxn, toSlug]);


  // Gráfica (usa egresos en MXN consistentes)
  // Gráfica (usa egresos en MXN consistentes)
  const chartConfig = useMemo(() => {
    const disp = (mxn) =>
      displayCurrency === "USD"
        ? (Number(mxn) || 0) / (Number(usdToMxn) || 17)
        : (Number(mxn) || 0);

    // Cuentas elegidas en estrategia (normalizadas a slug)
    const needsAcc = toSlug(strategy?.needs?.account) || strategy?.needs?.account || null;
    const wantsAcc = toSlug(strategy?.wants?.account) || strategy?.wants?.account || null;
    const futureAcc = toSlug(strategy?.future?.account) || strategy?.future?.account || null;
    const strategyAccs = new Set([needsAcc, wantsAcc, futureAcc].filter(Boolean));

    // TOTALES PARA EL HEADER (mostrados en FinanceChart):
    // - strategyIncome: sólo ingresos de salario en las 3 cuentas de estrategia
    // - globalIncome: todos los ingresos (como antes)
    const strategyIncome = srcIncomes
      .filter(i => (i.isSalary === true || i.isSalary === "true") && strategyAccs.has(toSlug(i.account) || i.account))
      .reduce((s, i) => s + incomeToMx(i, usdToMxn), 0);

    const globalIncome = srcIncomes.reduce((s, i) => s + incomeToMx(i, usdToMxn), 0);

    // Selección de dataset para el pie:
    const isStrategy = chartView === "strategy";

    // Ingresos base del gráfico (MXN)
    const totalIncome = isStrategy ? strategyIncome : globalIncome;

    // Egresos a graficar:
    // - strategy: sólo egresos cuya cuenta esté en las 3 cuentas seleccionadas
    // - global: todos los egresos
    const expensesToChart = isStrategy
      ? srcExpenses.filter(e => strategyAccs.has(toSlug(e.account) || e.account))
      : srcExpenses;

    if (!Number.isFinite(totalIncome) || totalIncome <= 0) {
      return {
        data: {
          labels: ["Sin Ingresos"],
          datasets: [{ data: [1], backgroundColor: ["#e5e7eb"], borderColor: "#fff", borderWidth: 2 }],
        },
        options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false },
        totals: { strategyIncome, globalIncome },
      };
    }

    // Agrupar egresos por grupo (siempre convertir a MXN)
    const groupedMx = expensesToChart.reduce((acc, exp) => {
      const g = exp.group || "Otros";
      const v = expenseToMx(exp, usdToMxn);
      acc[g] = (acc[g] || 0) + v;
      return acc;
    }, {});
    const sumGroupMx = Object.values(groupedMx).reduce((s, v) => s + v, 0);
    const remainingMx = Math.max(0, totalIncome - sumGroupMx);

    const groupedDisp = Object.fromEntries(
      Object.entries(groupedMx).map(([k, v]) => [k, disp(v)])
    );
    const remainingDisp = disp(remainingMx);

    const labels = [isStrategy ? "Salario Restante" : "Ingreso Restante", ...Object.keys(groupedDisp)];
    const dataVals = [remainingDisp, ...Object.values(groupedDisp)];

    const colorMap = {
      "Salario Restante": "#4ade80",
      "Ingreso Restante": "#4ade80",
      Necesidades: "#fb923c",
      "Deseos / Ocio": "#2dd4bf",
      Ahorro: "#60a5fa",
      Inversión: "#a78bfa",
      Deudas: "#f472b6",
      "Movimientos entre Cuentas": "#9ca3af",
      Otros: "#cccccc",
    };
    const backgroundColor = labels.map((l) => colorMap[l] || "#cccccc");

    return {
      data: { labels, datasets: [{ data: dataVals, backgroundColor, borderColor: "#ffffff", borderWidth: 2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (c) =>
                `${c.label}: ${new Intl.NumberFormat(
                  displayCurrency === "USD" ? "en-US" : "es-MX",
                  { style: "currency", currency: displayCurrency }
                ).format(c.parsed)}`,
            },
          },
        },
      },
      totals: { strategyIncome, globalIncome },
    };
  }, [chartView, srcIncomes, srcExpenses, strategy, usdToMxn, displayCurrency, toSlug]);

  // genera un slug simple tipo "mercadoPago" o "bbva"
  const makeSlug = (name, existing = {}) => {
    const clean = String(name || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita acentos
      .replace(/[^a-zA-Z0-9\s]/g, " ")                  // quita símbolos
      .trim()
      .split(/\s+/);

    if (clean.length === 0) return null;
    const camel = clean
      .map((w, i) => i === 0 ? w.toLowerCase() : (w[0].toUpperCase() + w.slice(1).toLowerCase()))
      .join("");

    let slug = camel || null;
    // evita colisiones si ya existe
    let k = 2;
    while (slug && (existing[slug] || Object.prototype.hasOwnProperty.call(existing, slug))) {
      slug = `${camel}${k++}`;
    }
    return slug;
  };


  // Movimientos combinados (filtrados)
  const allMovements = useMemo(() => {
    const normalizeAcc = (x) => toSlug(x) || x || null;
    return [
      ...srcIncomes.map((i) => ({ ...i, account: normalizeAcc(i.account), movType: "Ingreso", tableId: `inc-${i.id}` })),
      ...srcExpenses.map((e) => ({ ...e, account: normalizeAcc(e.account), movType: "Egreso", tableId: `exp-${e.id}` })),
      ...srcTransfers.flatMap((t) => {
        const fromSlug = normalizeAcc(t.from);
        const toSlugVal = normalizeAcc(t.to);
        return [
          {
            ...t,
            movType: "Transferencia Salida",
            amount: t.amountSent,
            currency: t.currencySent,
            account: fromSlug,
            from: fromSlug,
            to: toSlugVal,
            tableId: `t-${t.id}-out`,
          },
          {
            ...t,
            movType: "Transferencia Entrada",
            amount: t.amountReceived,
            currency: t.currencyReceived,
            account: toSlugVal,
            from: fromSlug,
            to: toSlugVal,
            tableId: `t-${t.id}-in`,
          },
        ];
      }),
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [srcIncomes, srcExpenses, srcTransfers, toSlug]);

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
      "description",
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
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "historial_financiero.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Exporta en el formato simple de la tabla: Fecha, Tipo, Descripción, Cuenta, Monto
  const handleCsvExportTabla = () => {
    const pad = (n) => String(n).padStart(2, "0");
    const formatDateEs = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (isNaN(d)) return "";
      let h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? "p.m." : "a.m.";
      h = h % 12; if (h === 0) h = 12;
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}, ${pad(h)}:${pad(m)} ${ampm}`;
    };
    const normCurrency = (c) => (String(c).toUpperCase() === "USD" ? "USD" : "MXN");
    const fmtMoney = (n, c) => new Intl.NumberFormat(
      c === "USD" ? "en-US" : "es-MX",
      { style: "currency", currency: c }
    ).format(Number(n) || 0);
    const accountNameBySlug = (slug) => ACCOUNTS?.[slug]?.name || slug || "";

    const rows = [];

    for (const i of incomes) {
      const fecha = formatDateEs(i.timestamp);
      const tipo = "Ingreso";
      const desc =
        (i.description ?? "").trim() ||
        ((i.originalText ?? "").split("(")[0].trim()) ||
        (i.currency?.toUpperCase() === "USD" && i.amount ? `$${Number(i.amount).toFixed(2)}` : "Ingreso");
      const cuenta = accountNameBySlug(i.account);
      const monto = `+${fmtMoney(i.convertedAmount ?? i.amount ?? 0, "MXN")}`;
      rows.push([fecha, tipo, desc, cuenta, monto]);
    }

    for (const e of expenses) {
      const fecha = formatDateEs(e.timestamp);
      const tipo = "Egreso";
      const cuenta = accountNameBySlug(e.account);
      const cur = normCurrency(e.currency || ACCOUNTS?.[e.account]?.currency || "MXN");
      const desc = (e.description ?? e.category ?? "Egreso").toString();
      const monto = `-${fmtMoney(e.amount ?? 0, cur)}`;
      rows.push([fecha, tipo, desc, cuenta, monto]);
    }

    for (const t of transfers) {
      const fecha = formatDateEs(t.timestamp);
      {
        const tipo = "Envío";
        const desc = `a ${accountNameBySlug(t.to)}`;
        const cuenta = accountNameBySlug(t.from);
        const cur = normCurrency(t.currencySent || ACCOUNTS?.[t.from]?.currency || "MXN");
        const monto = `-${fmtMoney(t.amountSent ?? 0, cur)}`;
        rows.push([fecha, tipo, desc, cuenta, monto]);
      }
      {
        const tipo = "Recepción";
        const desc = `de ${accountNameBySlug(t.from)}`;
        const cuenta = accountNameBySlug(t.to);
        const cur = normCurrency(t.currencyReceived || ACCOUNTS?.[t.to]?.currency || "MXN");
        const monto = `+${fmtMoney(t.amountReceived ?? 0, cur)}`;
        rows.push([fecha, tipo, desc, cuenta, monto]);
      }
    }

    rows.sort((a, b) => {
      const parse = (s) => {
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2}),\s*(\d{2}):(\d{2})\s*(a\.m\.|p\.m\.)$/i);
        if (!m) return 0;
        let [_, dd, MM, yy, hh, mm, ap] = m;
        let year = 2000 + Number(yy);
        let hour = Number(hh) % 12;
        if (/p\.m\./i.test(ap)) hour += 12;
        return Date.UTC(year, Number(MM) - 1, Number(dd), hour, Number(mm), 0);
      };
      return parse(b[0]) - parse(a[0]);
    });

    const headers = ["Fecha", "Tipo", "Descripción", "Cuenta", "Monto"];
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const csv = [headers.join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "historial_financiero_tabla.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };



  // Reemplaza TODO tu handleCsvImport por esta versión:
  const handleCsvImport = (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !db) {
      showNotification("No se pudo importar: sesión o base de datos no lista.", "error");
      return;
    }

    const reader = new FileReader();

    reader.onload = async (ev) => {
      try {
        const text = String(ev.target?.result || "").trim();
        if (!text) throw new Error("Archivo vacío");

        // --- Utilidades de parsing ---
        const parseCsvLine = (line) => {
          // Extrae campos respetando comillas dobles
          const re = /("([^"]*(?:""[^"]*)*)"|[^,]*)(,|$)/g;
          const out = [];
          let m;
          let i = 0;
          while ((m = re.exec(line)) !== null) {
            let cell = m[1] ?? "";
            // Si venía entre comillas, des-escapar comillas dobles
            if (cell.startsWith('"') && cell.endsWith('"')) {
              cell = cell.slice(1, -1).replace(/""/g, '"');
            }
            out.push(cell);
            i++;
            if (m.index === re.lastIndex) re.lastIndex++;
          }
          return out;
        };

        const toLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (toLines.length < 2) throw new Error("El CSV no tiene filas suficientes.");

        // Heaaders (normalizados a minúsculas)
        const headersRaw = parseCsvLine(toLines[0]);
        const headers = headersRaw.map((h) => (h || "").trim());
        const headersLower = headers.map((h) => h.toLowerCase());

        const hIdx = (name) => headersLower.indexOf(name.toLowerCase());
        const has = (name) => hIdx(name) !== -1;

        // Detectar formato "tabla" (export que muestra Fecha, Tipo, Descripción, Cuenta, Monto)
        const isTableFormat =
          (has("fecha") || has("Fecha")) &&
          (has("tipo") || has("Tipo")) &&
          (has("cuenta") || has("Cuenta")) &&
          (has("monto") || has("Monto"));

        const escTrim = (s) => (s ?? "").toString().trim();
        const parseNum = (v) => {
          if (v == null) return null;
          let s = String(v).trim();
          // Limpiar formato tipo “$1,234.56” o “+$1,234.56” o “-$1,234.56”
          s = s.replace(/[+$\s]/g, "").replace(/,/g, "");
          if (s === "") return null;
          const n = Number(s);
          return Number.isFinite(n) ? n : null;
        };

        // Insert helpers
        const addIncome = (obj) =>
          addDoc(collection(db, "artifacts", APP_ID, "users", userId, "incomes"), obj);
        const addExpense = (obj) =>
          addDoc(collection(db, "artifacts", APP_ID, "users", userId, "expenses"), obj);
        const addTransfer = (obj) =>
          addDoc(collection(db, "artifacts", APP_ID, "users", userId, "transfers"), obj);

        // --- Importación ---
        let imported = 0;

        if (isTableFormat) {
          // ====== MODO TABLA ======
          const idxFecha = hIdx("fecha");
          const idxTipo = hIdx("tipo");
          const idxDesc = hIdx("descripción") !== -1 ? hIdx("descripción") : hIdx("descripcion");
          const idxCuenta = hIdx("cuenta");
          const idxMonto = hIdx("monto");

          for (let i = 1; i < toLines.length; i++) {
            const row = parseCsvLine(toLines[i]);
            if (!row.length) continue;

            const rawTipo = escTrim(row[idxTipo] || "");
            const tipo = rawTipo.toLowerCase();
            const cuenta = escTrim(row[idxCuenta] || "");
            const desc = idxDesc !== -1 ? escTrim(row[idxDesc] || "") : null;
            let montoStr = String(row[idxMonto] || "").trim();

            // Determinar signo y moneda por prefijo
            const isPositive = montoStr.startsWith("+");
            const isNegative = montoStr.startsWith("-");
            const isUsd = /\$/.test(montoStr) && /[0-9]/.test(montoStr) && /[$]/.test(montoStr); // genérico

            // Limpiar y obtener valor
            const amountAbs = parseNum(montoStr);
            if (amountAbs == null) continue;

            // Fecha -> ISO (dejamos original como texto si no podemos parsear)
            const rawFecha = escTrim(row[idxFecha] || "");
            const iso = (() => {
              // Intento rápido: Date.parse sobre “DD/MM/YY, HH:MM [a.m.|p.m.]”
              // Si falla, guardamos timestamp actual para no romper.
              const d = new Date(rawFecha);
              if (!Number.isNaN(d.getTime())) return d.toISOString();
              return new Date().toISOString();
            })();

            if (tipo === "ingreso") {
              // El CSV de tabla ya trae el monto mostrado en la UI.
              // Si la cuenta es USD (p.ej. Dolar App), aquí IMPORTAMOS como ingreso MXN si ya venía convertido.
              // Heurística: si el texto tenía un "+$6,xxx.xx" pensamos que UI ya mostró MXN. Guardamos como MXN.
              const income = {
                timestamp: iso,
                amount: amountAbs,           // monto como se muestra
                currency: "MXN",
                convertedAmount: amountAbs,  // conservamos MXN
                originalText: desc || null,
                account: cuenta,
                isSalary: false,
                rateUsed: null,
                description: desc || null,
              };
              await addIncome(income);
              imported++;
            } else if (tipo === "egreso") {
              const expense = {
                timestamp: iso,
                amount: amountAbs,      // lo que ves en la tabla
                currency: "MXN",
                convertedAmount: amountAbs,
                category: desc || null,
                account: cuenta,
                type: null,
                group: null,
                description: desc || null,
              };
              await addExpense(expense);
              imported++;
            } else if (tipo === "envío" || tipo === "recepción") {
              // En la tabla cada transferencia aparece en 2 filas (salida/entrada).
              // Para evitar duplicados, aquí no intentamos recomponer la transferencia original.
              // Si quisieras reconstruirlas, necesitarías pairing por timestamp cercano + descripción.
              // De momento las omitimos para no duplicar.
              continue;
            } else {
              // Otro tipo no reconocido en tabla → ignoramos
              continue;
            }
          }
        } else {
          // ====== MODO TÉCNICO ======
          // Leemos por cabeceras: type, amount, currency, convertedAmount, rateUsed, category, group, ...
          const idx = (name, fallback = null) => {
            const i = hIdx(name);
            return i === -1 ? fallback : i;
          };

          for (let i = 1; i < toLines.length; i++) {
            const row = parseCsvLine(toLines[i]);
            if (!row.length) continue;

            const cell = (name) => {
              const i = idx(name);
              return i == null ? "" : row[i];
            };

            const typeRaw = (cell("type") || "").toString().trim().toLowerCase();

            if (typeRaw === "income") {
              const baseAmount = parseNum(cell("amount"));
              const currency = escTrim(cell("currency")) || "MXN";
              let convertedAmount = parseNum(cell("convertedAmount"));
              const rateUsed = parseNum(cell("rateUsed"));

              if ((convertedAmount == null || !Number.isFinite(convertedAmount)) && baseAmount != null) {
                convertedAmount =
                  currency.toUpperCase() === "USD"
                    ? baseAmount * (Number(usdToMxn) || 17)
                    : baseAmount;
              }

              const newIncome = {
                timestamp: escTrim(cell("timestamp")) || new Date().toISOString(),
                amount: baseAmount,
                currency,
                convertedAmount,
                rateUsed: rateUsed ?? null,
                isSalary: String(escTrim(cell("isSalary"))).toLowerCase() === "true",
                originalText: escTrim(cell("originalText")) || null,
                account: escTrim(cell("account")),
                description: escTrim(cell("description")) || null,
              };
              await addIncome(newIncome);
              imported++;
            } else if (typeRaw === "expense" || typeRaw === "need" || typeRaw === "want") {
              // Mapeo need/want como expense con semántica y grupo correctos
              const baseAmount = parseNum(cell("amount"));
              const currency = escTrim(cell("currency")) || "MXN";
              let convertedAmount = parseNum(cell("convertedAmount"));
              const category = escTrim(cell("category")) || null;

              if ((convertedAmount == null || !Number.isFinite(convertedAmount)) && baseAmount != null) {
                convertedAmount =
                  currency.toUpperCase() === "USD"
                    ? baseAmount * (Number(usdToMxn) || 17)
                    : baseAmount;
              }

              const groupByType =
                typeRaw === "need"
                  ? "Necesidades"
                  : typeRaw === "want"
                    ? "Deseos / Ocio"
                    : escTrim(cell("group")) || null;

              const typeSemantic =
                typeRaw === "need"
                  ? "need"
                  : typeRaw === "want"
                    ? "want"
                    : escTrim(cell("typeSemantic")) || null;

              const newExpense = {
                timestamp: escTrim(cell("timestamp")) || new Date().toISOString(),
                amount: baseAmount,
                currency,
                convertedAmount,
                category,
                account: escTrim(cell("account")),
                group: groupByType,
                type: typeSemantic,
                description: escTrim(cell("description")) || null,
              };
              await addExpense(newExpense);
              imported++;
            } else if (typeRaw === "transfer") {
              const newTransfer = {
                timestamp: escTrim(cell("timestamp")) || new Date().toISOString(),
                from: escTrim(cell("from")),
                to: escTrim(cell("to")),
                amountSent: parseNum(cell("amountSent")),
                currencySent: escTrim(cell("currencySent")) || null,
                amountReceived: parseNum(cell("amountReceived")),
                currencyReceived: escTrim(cell("currencyReceived")) || null,
                spread: parseNum(cell("spread")),
                rate: parseNum(cell("rateUsed")) || parseNum(cell("rate")) || null,
                description: escTrim(cell("description")) || null,
              };
              await addTransfer(newTransfer);
              imported++;
            } else {
              // Tipo desconocido → ignoramos fila para no romper import masivo
              continue;
            }
          }
        }

        showNotification(`Importación completa: ${imported} filas importadas.`, "success");
      } catch (err) {
        console.error("CSV import error", err);
        showNotification(`Error al procesar el CSV: ${err?.message || err}`, "error");
      } finally {
        // Resetea el input para permitir re-importar el mismo archivo si se desea
        e.target.value = "";
      }
    };

    reader.onerror = () => {
      showNotification("No se pudo leer el archivo CSV.", "error");
      e.target.value = "";
    };

    reader.readAsText(file);
  };




  const clearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  // Render
  return (
    <div className="bg-gray-100 min-h-screen text-gray-800 font-sans">
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

      <Header />

      <div className="pt-16 p-4 lg:p-8">
        <div className="w-full lg:w-4/5 mx-auto">
          {/* Filtros por fecha */}
          <section className="mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Moneda:</span>
              <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDisplayCurrency("MXN")}
                  className={`px-3 py-1 text-xs ${displayCurrency === "MXN" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
                >
                  MXN
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayCurrency("USD")}
                  className={`px-3 py-1 text-xs ${displayCurrency === "USD" ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
                >
                  USD
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-end gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha inicial</label>
                <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fecha final</label>
                <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex-1" />
              {(startDate || endDate) ? (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-slate-600">
                    Filtrando del <strong>{startDate || "—"}</strong> al <strong>{endDate || "—"}</strong>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={clearDates}>Limpiar</button>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Sin filtros (mostrando todo)</div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="text-xs text-indigo-700 mb-1">Salario en el periodo</div>
                <div className="text-2xl font-bold text-indigo-900">{fmtDisp(totalSalaryIncome)}</div>
                <div className="text-[11px] text-indigo-700 mt-1">Total salario: {fmt(totalSalaryIncome)} · Periodos: {periodsInfo.periods}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="text-xs text-emerald-700 mb-2">Depósitos ideales por quincena</div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span>Necesidades: <strong>{fmtDisp(periodsInfo.perPeriod?.needs || 0)}</strong></span>
                  <span>Deseos: <strong>{fmtDisp(periodsInfo.perPeriod?.wants || 0)}</strong></span>
                  <span>Futuro: <strong>{fmtDisp(periodsInfo.perPeriod?.future || 0)}</strong></span>
                </div>
              </div>
            </div>
          </section>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <aside className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-lg flex flex-col self-start">
              <IncomeForm ACCOUNTS={accountsMap} onAddIncome={handleAddIncome} onNotify={showNotification} />

              <ExpenseForm ACCOUNTS={accountsMap} CATEGORIES={CATEGORIES} onAddExpense={handleAddExpense} onNotify={showNotification} />

              <AddAccountForm onCreate={handleCreateAccount} />

              <AccountBalances
                accountsMap={accountsMap}
                balances={balances}
                totalBalanceMx={totalBalanceMx}
                totalSpentMx={totalSpentMx}
                onDeleteAccount={(slug) => {
                  const id = accountIds[slug];
                  if (!id) return showNotification("No encuentro el ID de la cuenta.", "error");
                  deleteDoc(doc(db, "artifacts", APP_ID, "users", userId, "accounts", id))
                    .then(() => showNotification("Cuenta eliminada."))
                    .catch(() => showNotification("No se pudo eliminar la cuenta.", "error"));
                }}
              />

            </aside>

            <section className="lg:col-span-2 flex flex-col gap-8">
              <FinanceChart
                data={chartConfig.data}
                options={chartConfig.options}
                chartView={chartView}
                setChartView={setChartView}
                totalSalaryIncome={chartConfig.totals.strategyIncome} // 👈 ahora usa el filtrado por cuentas
                totalGlobalIncome={chartConfig.totals.globalIncome}   // 👈 total global como antes
              />

              <TransferForm ACCOUNTS={accountsMap} onAddTransfer={handleAddTransfer} onNotify={showNotification} />
              <Strategy503020
                data={strategyData}           // en MXN
                strategy={strategy}
                onChangeStrategy={setStrategy}
                accountsMap={accountsMap}
                usdToMxn={usdToMxn}
                displayCurrency={displayCurrency}   // <-- NUEVO
              />

            </section>

            <div className="lg:col-span-3">
              <HistoryTable
                ACCOUNTS={ACCOUNTS}
                ACCOUNT_IDS={{}}
                movements={allMovements || []}
                onDeleteClick={(id, type) => setItemToDelete({ id, type })}
                onCsvExport={handleCsvExport}           // técnico
                onCsvExportTable={handleCsvExportTabla} // tabla
                onCsvImport={handleCsvImport}
                onUpdateMovement={handleUpdateMovement}
              />

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
