/* Public website API client. Talks to the Express server, never to Mongo directly. */

const BASE = import.meta.env.VITE_API || "/api";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Something went wrong (${res.status}). Please try again.`);
  }
  return data;
}

export const api = {
  settings: () => request("/settings"),
  menu: (params = {}) => request(`/menu?${new URLSearchParams(params)}`),
  categories: () => request("/menu/categories"),
  packages: () => request("/menu/packages"),
  createOrder: (payload) => request("/orders", { method: "POST", body: payload }),
  trackOrder: (ref) => request(`/orders/track/${encodeURIComponent(ref.trim())}`),
  createEnquiry: (payload) => request("/enquiry", { method: "POST", body: payload }),
  createSub: (payload) => request("/subscriptions", { method: "POST", body: payload }),
  meals: () => request("/orders/meals"),
  todayMenu: () => request("/mess-menu/today"),
  weekMenu: () => request("/mess-menu/week")
};

/* ---------- display helpers ---------- */

export const rupees = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const MESSES = [
  { key: "divya-kitchen", label: "Divya's Kitchen", short: "DK" },
  { key: "digital-bharat", label: "Digital Bharat", short: "DB" }
];

export const messLabel = (key) => MESSES.find((m) => m.key === key)?.label || key;

export const EVENT_TYPES = [
  { id: "marriage", label: "Marriage", blurb: "Full wedding catering, multi-day if you need" },
  { id: "ring ceremony", label: "Ring Ceremony", blurb: "Morning to evening, with snacks" },
  { id: "birthday", label: "Birthday Party", blurb: "Lunch or dinner, veg and Jain-friendly" },
  { id: "corporate", label: "Corporate Party", blurb: "Office lunches, conferences, annual days" },
  { id: "other", label: "Something else", blurb: "Tell us in the message" }
];

/** 24h "HH:MM" -> "7:30 am" style label. */
export function slotLabel(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return t || "";
  const h = Number(m[1]);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

export const toMins = (t) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "").trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** Pickup slots for today, respecting the ordering window and lead time. */
export function buildSlots(settings, stepMin = 30) {
  if (!settings) return [];
  const open = toMins(settings.messOrderOpens);
  const close = toMins(settings.messOrderCloses);
  if (open === null || close === null) return [];

  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const lead = Number(settings.messOrderLeadMinutes) || 0;

  const out = [];
  for (let t = open; t < close; t += stepMin) {
    if (t < mins + lead) continue;
    out.push({
      value: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
      label: slotLabel(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`),
      late: t > close - 60
    });
  }
  return out;
}

export const todayLabel = () =>
  new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });


/** The three serving windows, in display order. */
export function mealSchedule(settings) {
  const w = (settings && settings.mealWindows) || {};
  const row = (id, label, icon, fallback) => ({
    id, label, icon,
    serves: w[id] ? `${w[id].servesFrom} - ${w[id].servesTill}` : fallback,
    order: w[id] ? `${w[id].orderOpens} - ${w[id].orderCutoff}` : ""
  });
  return [
    row("breakfast", "Breakfast", "sun", "08:30 - 10:30"),
    row("lunch", "Lunch", "plate", "12:00 - 14:00"),
    row("dinner", "Dinner", "moon", "19:00 - 21:00")
  ];
}
