import { NavLink, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { api } from "./api.js";
import { useEffect, useState } from "react";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";
import MenuEditor from "./pages/MenuEditor.jsx";
import Packages from "./pages/Packages.jsx";
import Enquiries from "./pages/Enquiries.jsx";
import Subscriptions from "./pages/Subscriptions.jsx";
import WeeklyPlan from "./pages/WeeklyPlan.jsx";
import MealTimes from "./pages/MealTimes.jsx";
import PlanPrices from "./pages/PlanPrices.jsx";
import Settings from "./pages/Settings.jsx";

function Logo({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 11h16a8 8 0 0 1-16 0Z" />
      <path d="M12 3v5" />
      <path d="M7 11c0-3 1-5 2-5s2 2 2 5" />
      <path d="M13 11c0-3 1-5 2-5s2 2 2 5" />
    </svg>
  );
}

function Sidebar({ pendingCount, enquiryCount, memberCount }) {
  const { admin, logout } = useAuth();

  const links = [
    { to: "/", end: true, label: "Dashboard" },
    { to: "/orders", label: "Orders", count: pendingCount, hot: pendingCount > 0 },
    { to: "/plan", label: "Mess plan" },
    { to: "/times", label: "Meal times" },
    { to: "/prices", label: "Membership prices" },
    { to: "/subscriptions", label: "Mess members", count: memberCount },
    { to: "/packages", label: "Catering packages" },
    { to: "/enquiries", label: "Enquiries", count: enquiryCount },
    { to: "/settings", label: "Settings" }
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">
          <Logo />
        </span>
        <span className="brand-text">
          Divya Catering
          <small>Admin panel</small>
        </span>
      </div>

      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          {l.label}
          {l.count > 0 && <span className={"count" + (l.hot ? " hot" : "")}>{l.count}</span>}
        </NavLink>
      ))}

      <div className="sidebar-foot">
        <p>
          Signed in as <strong style={{ color: "#d9d3ca" }}>{admin?.name}</strong>
          <br />
          <span className="small">{admin?.email}</span>
        </p>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          Sign out
        </button>
        <p style={{ marginTop: 10 }}>
          <a href="/" target="_blank" rel="noreferrer">
            View website &rarr;
          </a>
        </p>
      </div>
    </aside>
  );
}

export default function App() {
  const { admin } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({ pending: 0, enquiries: 0 });

  useEffect(() => {
    if (!admin) return;
    let alive = true;
    (async () => {
      try {
        const [stats, enq, subs] = await Promise.all([
          api.orderStats(),
          api.adminEnquiries({ handled: "false" }),
          api.subStats().catch(() => null)
        ]);
        if (!alive) return;
        setCounts({
          pending: (stats.byStatus.pending || 0) + (stats.byStatus.confirmed || 0),
          enquiries: enq.count || 0,
          members: subs?.byStatus?.pending || 0
        });
      } catch {
        /* badge counts are cosmetic, never block the app */
      }
    })();
    return () => {
      alive = false;
    };
  }, [admin, location.pathname]);

  if (!admin) return <Login />;

  return (
    <div className="app">
      <Sidebar pendingCount={counts.pending} enquiryCount={counts.enquiries} memberCount={counts.members} />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/menu" element={<MenuEditor />} />
          <Route path="/plan" element={<WeeklyPlan />} />
          <Route path="/times" element={<MealTimes />} />
          <Route path="/prices" element={<PlanPrices />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/enquiries" element={<Enquiries />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
