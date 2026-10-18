import { useEffect, useState, useMemo, useCallback } from "react";
import { api, MESSES } from "../api.js";

const SHARED = "all";
import { rupees, Spinner, Empty, Alert, Confirm, ItemModal, messLabel } from "../ui.jsx";

export default function MenuEditor() {
  const [mess] = useState(SHARED);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      setItems(await api.adminMenu({ mess }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [mess]);

  useEffect(() => {
    load();
    setSearch("");
    setCat("all");
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.cat).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => (cat === "all" ? true : i.cat === cat))
      .filter((i) => (q ? (i.name + " " + (i.desc || "")).toLowerCase().includes(q) : true))
      .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
  }, [items, search, cat]);

  async function toggle(item) {
    setErr("");
    try {
      const updated = await api.setAvailable(item.id, !item.available);
      setItems((list) => list.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setErr(e.message);
    }
  }

  async function bulkAll(available) {
    setErr("");
    setOk("");
    try {
      const res = await api.toggleMess(mess, available);
      setOk(`${res.changed} item${res.changed === 1 ? "" : "s"} updated on the website.`);
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function quickAdd(e) {
    e.preventDefault();
    if (!quickName.trim()) return;
    setErr("");
    try {
      await api.saveItem({
        name: quickName.trim(),
        price: Number(quickPrice) || 0,
        cat: categories.includes("mains") ? "mains" : categories[0] || "mains",
        mess,
        scope: "mess",
        available: true,
        order: (items.length + 1) * 10,
        desc: "",
        tags: [],
        note: "",
        unit: "plate"
      });
      setQuickName("");
      setQuickPrice("");
      setOk("Added. It is live on the website now.");
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function saveItem(item) {
    const updated = await api.saveItem(item);
    setItems((list) => {
      const exists = list.some((i) => i.id === updated.id);
      return exists ? list.map((i) => (i.id === updated.id ? updated : i)) : [...list, updated];
    });
  }

  const liveCount = items.filter((i) => i.available).length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Today&rsquo;s menu</h1>
          <p className="sub">
            Changes here go straight to the website, for both messes and for delivery.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => bulkAll(true)}>
            Mark all available
          </button>
          <button className="btn btn-ghost" onClick={() => bulkAll(false)}>
            Close the board
          </button>
          <button className="btn btn-primary" onClick={() => setEditing({})}>
            Add dish
          </button>
        </div>
      </div>

      <div className="alert alert-info">
        This board is shared. Both Divya's Kitchen and Digital Bharat serve everything
        listed here, and the same dishes can be ordered for home delivery in Gwalior.
      </div>

      {err && <Alert>{err}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="card">
        <form className="switch-row" onSubmit={quickAdd} style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="txt" style={{ flex: 1 }}>
            <strong>Quick add a dish</strong>
            <span>Type a name and price, hit add. Edit the details afterwards.</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Dish name"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              style={{ width: 190 }}
            />
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="₹ price"
              value={quickPrice}
              onChange={(e) => setQuickPrice(e.target.value)}
              style={{ width: 100 }}
            />
            <button className="btn btn-dark" type="submit">
              Add
            </button>
          </div>
        </form>

        <div style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
          <span className="pill">
            {liveCount} of {items.length} showing on the website
          </span>
        </div>

        <div className="toolbar" style={{ margin: "14px 0 0" }}>
          <input
            className="chip-search"
            type="text"
            placeholder="Search this mess"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className={"chip" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>
            all
          </button>
          {categories.map((c) => (
            <button key={c} className={"chip" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="card">
          <Empty title="No dishes here yet">
            Use the quick add box above, or press <strong>Add dish</strong> for the full editor.
          </Empty>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Live</th>
                  <th>Dish</th>
                  <th>Cat</th>
                  <th className="num">Price</th>
                  <th>Note</th>
                  <th className="num">Order</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} style={{ opacity: i.available ? 1 : 0.55 }}>
                    <td>
                      <button
                        className={"switch" + (i.available ? " on" : "")}
                        onClick={() => toggle(i)}
                        aria-label={i.available ? "Hide from the website" : "Show on the website"}
                        title={i.available ? "Showing on the website" : "Hidden from the website"}
                      />
                    </td>
                    <td>
                      <strong>{i.name}</strong>
                      {i.featured && <span className="badge badge-ready" style={{ marginLeft: 8 }}>pick</span>}
                      {i.desc && <div className="small muted">{i.desc}</div>}
                      {(i.tags || []).length > 0 && (
                        <div className="small muted">{i.tags.join(" · ")}</div>
                      )}
                    </td>
                    <td>
                      <span className="pill">{i.cat}</span>
                    </td>
                    <td className="num">{rupees(i.price)}</td>
                    <td className="small">{i.note || "-"}</td>
                    <td className="num muted">{i.order}</td>
                    <td className="right nowrap">
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(i)}>
                        Edit
                      </button>{" "}
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(i)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <ItemModal
          item={editing.id || editing._id ? editing : null}
          fixedMess={mess}
          messes={MESSES}
          onSave={saveItem}
          onClose={() => setEditing(null)}
        />
      )}

      <Confirm
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.name}?`}
        message="This removes the dish from the website permanently. To take it off today's board without losing it, switch the Live toggle off instead."
        confirmLabel="Delete dish"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          try {
            await api.deleteItem(confirmDelete.id);
            setItems((list) => list.filter((i) => i.id !== confirmDelete.id));
          } catch (e) {
            setErr(e.message);
          }
          setConfirmDelete(null);
        }}
      />
    </>
  );
}
