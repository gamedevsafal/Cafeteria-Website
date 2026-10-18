const BASE = import.meta.env.VITE_API || "/api";

let token = localStorage.getItem("dc_token") || null;

async function request(path, { method = "GET", body, ...rest } = {}) {
  const headers = { ...(rest.headers || {}) };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest
  });

  if (res.status === 401 && path !== "/auth/me" && path !== "/auth/login") {
    token = null;
    localStorage.removeItem("dc_token");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  setToken(t) {
    token = t;
    if (t) localStorage.setItem("dc_token", t);
    else localStorage.removeItem("dc_token");
  },
  get token() {
    return token;
  },

  /* auth */
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  /* menu */
  publicMenu: (params = {}) => request(`/menu?${new URLSearchParams(params)}`),
  adminMenu: (params = {}) => request(`/menu/admin/all?${new URLSearchParams(params)}`),
  // The server upserts on _id, so one endpoint covers create and edit.
  saveItem: (item) => request("/menu/admin", { method: "POST", body: item }),
  deleteItem: (id) => request(`/menu/admin/${id}`, { method: "DELETE" }),
  setAvailable: (id, available) =>
    request(`/menu/admin/${id}/available`, { method: "PATCH", body: { available } }),
  toggleMess: (mess, available) =>
    request(`/menu/admin/mess/${mess}/toggle`, { method: "POST", body: { available } }),
  replaceMessMenu: (mess, items) =>
    request(`/menu/admin/mess/${mess}`, { method: "PUT", body: { items } }),

  /* orders */
  createOrder: (payload) => request("/orders", { method: "POST", body: payload }),
  trackOrder: (ref) => request(`/orders/track/${ref}`),
  adminOrders: (params = {}) => request(`/orders/admin?${new URLSearchParams(params)}`),
  order: (id) => request(`/orders/admin/${id}`),
  orderStats: () => request("/orders/admin/stats"),
  setOrderStatus: (id, status, statusNote) =>
    request(`/orders/admin/${id}/status`, { method: "PATCH", body: { status, statusNote } }),
  markPaid: (id, method = "stripe") => request(`/orders/admin/${id}/paid`, { method: "POST", body: { method } }),
  deleteOrder: (id) => request(`/orders/admin/${id}`, { method: "DELETE" }),
  exportUrl: (params = {}) => `${BASE}/orders/admin/export.csv?${new URLSearchParams(params)}`,

  /* enquiries */
  createEnquiry: (payload) => request("/enquiry", { method: "POST", body: payload }),
  adminEnquiries: (params = {}) => request(`/enquiry/admin?${new URLSearchParams(params)}`),
  updateEnquiry: (id, patch) => request(`/enquiry/admin/${id}`, { method: "PATCH", body: patch }),
  deleteEnquiry: (id) => request(`/enquiry/admin/${id}`, { method: "DELETE" }),

  /* weekly mess plan */
  todayMenu: () => request("/mess-menu/today"),
  weekMenu: () => request("/mess-menu/week"),
  menuOptions: () => request("/mess-menu/options"),
  adminWeek: () => request("/mess-menu/admin/week"),
  saveWeek: (days) => request("/mess-menu/admin/week", { method: "PUT", body: { days } }),
  saveToday: (menu) => request("/mess-menu/admin/today", { method: "PUT", body: menu }),
  resetToday: () => request("/mess-menu/admin/today", { method: "DELETE" }),

  /* mess memberships */
  createSub: (payload) => request("/subscriptions", { method: "POST", body: payload }),
  adminSubs: (params = {}) => request(`/subscriptions/admin?${new URLSearchParams(params)}`),
  subStats: () => request("/subscriptions/admin/stats"),
  updateSub: (id, patch) => request(`/subscriptions/admin/${id}`, { method: "PATCH", body: patch }),
  deleteSub: (id) => request(`/subscriptions/admin/${id}`, { method: "DELETE" }),

  /* settings */
  settings: () => request("/settings"),
  adminSettings: () => request("/settings/admin"),
  saveSettings: (patch) => request("/settings/admin", { method: "PUT", body: patch }),

  async downloadSubsCsv(params = {}) {
    const res = await fetch(`${BASE}/subscriptions/admin/export.csv?${new URLSearchParams(params)}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error("Could not export");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `divya-memberships-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  /* csv download needs the auth header, so fetch it rather than navigating */
  async downloadCsv(params = {}) {
    const res = await fetch(`${api.exportUrl(params)}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error("Could not export");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `divya-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};

export const MESSES = [
  { key: "divya-kitchen", label: "Divya's Kitchen", short: "DK" },
  { key: "digital-bharat", label: "Digital Bharat", short: "DB" },
  { key: "all", label: "Both / All", short: "ALL" }
];

export const STATUSES = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

export const EVENT_TYPES = [
  "marriage",
  "ring ceremony",
  "birthday",
  "corporate",
  "other"
];
