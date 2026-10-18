import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { api, MESSES } from "./api.js";

const KEY = "dc_cart_v2";

const DataContext = createContext(null);
const CartContext = createContext(null);

function readCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const clean = {};
    Object.keys(parsed).forEach((k) => {
      const q = Math.floor(Number(parsed[k]));
      if (q > 0 && q < 100) clean[k] = q;
    });
    return clean;
  } catch {
    return {};
  }
}

/* ---------- Site data: settings + menu, loaded once and shared ---------- */

export function DataProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [menu, setMenu] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mess, setMess] = useState(() => {
    try {
      return localStorage.getItem("dc_mess") || MESSES[0].key;
    } catch {
      return MESSES[0].key;
    }
  });

  const load = useCallback(async () => {
    setError("");
    try {
      const [s, m, p] = await Promise.all([
        api.settings(),
        api.menu({ scope: "mess" }),
        api.packages()
      ]);
      setSettings(s);
      setMenu(m);
      setPackages(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chooseMess = useCallback((key) => {
    setMess(key);
    try {
      localStorage.setItem("dc_mess", key);
    } catch {}
  }, []);

  const value = useMemo(
    () => ({ settings, menu, packages, loading, error, reload: load, mess, chooseMess }),
    [settings, menu, packages, loading, error, load, mess, chooseMess]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

/* ---------- Cart: survives page reloads, keyed on database ids ---------- */

export function CartProvider({ children }) {
  const { menu } = useData();
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  /* Drop anything that has since been deleted or hidden by the kitchen. */
  useEffect(() => {
    if (!menu.length) return;
    const live = new Map(menu.map((i) => [i.id, i]));
    setCart((prev) => {
      const next = {};
      let changed = false;
      Object.keys(prev).forEach((id) => {
        if (live.has(id)) next[id] = prev[id];
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [menu]);

  const add = useCallback((id, qty = 1) => {
    setCart((c) => ({ ...c, [id]: Math.min((c[id] || 0) + qty, 20) }));
  }, []);

  const setQty = useCallback((id, qty) => {
    setCart((c) => {
      if (qty <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: Math.min(qty, 20) };
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const items = useMemo(() => {
    return Object.entries(cart)
      .map(([id, qty]) => {
        const item = menu.find((m) => m.id === id);
        return item ? { ...item, qty } : null;
      })
      .filter(Boolean);
  }, [cart, menu]);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((n, i) => n + i.price * i.qty, 0),
    [items]
  );

  const value = useMemo(
    () => ({ cart, items, count, subtotal, add, setQty, clear }),
    [cart, items, count, subtotal, add, setQty, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
