import { useEffect, useState, useCallback } from "react";
import { api, MESSES } from "../api.js";
import { rupees, Spinner, Empty, Alert, Confirm, ItemModal } from "../ui.jsx";

export default function Packages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.adminMenu({ scope: "catering" }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(item) {
    try {
      const updated = await api.setAvailable(item.id, !item.available);
      setItems((l) => l.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e) {
      setErr(e.message);
    }
  }

  async function saveItem(item) {
    const updated = await api.saveItem({ ...item, scope: "catering", mess: "all", unit: item.unit || "event" });
    setItems((l) => {
      const exists = l.some((i) => i.id === updated.id);
      return exists ? l.map((i) => (i.id === updated.id ? updated : i)) : [...l, updated];
    });
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Catering packages</h1>
          <p className="sub">
            These appear in the catering section of the website and can be added to a
            customer&rsquo;s booking request.
          </p>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setEditing({})}>
            Add package
          </button>
        </div>
      </div>

      {err && <Alert>{err}</Alert>}
      {ok && <Alert kind="ok">{ok}</Alert>}

      <div className="alert alert-info">
        Each package covers one Paneer Sabji, Dal Makhani, one Dry Sabji, Rice, Roti and one
        Sweet, for the stated headcount, at lunch or dinner. Prices below came from the
        client and are editable.
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <div className="card">
          <Empty title="No packages yet">Add your first package with the button above.</Empty>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Live</th>
                  <th>Package</th>
                  <th>Serves</th>
                  <th className="num">Price</th>
                  <th className="num">Per head (from)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...items]
                  .sort((a, b) => a.price - b.price)
                  .map((i) => {
                    const min = parseInt(i.serves, 10);
                    const perHead = Number.isFinite(min) && min > 0 ? i.price / min : null;
                    return (
                      <tr key={i.id} style={{ opacity: i.available ? 1 : 0.55 }}>
                        <td>
                          <button
                            className={"switch" + (i.available ? " on" : "")}
                            onClick={() => toggle(i)}
                            aria-label="Toggle on the website"
                          />
                        </td>
                        <td>
                          <strong>{i.name}</strong>
                          {i.featured && <span className="badge badge-ready" style={{ marginLeft: 8 }}>popular</span>}
                          {i.desc && <div className="small muted">{i.desc}</div>}
                        </td>
                        <td>{i.serves || "-"}</td>
                        <td className="num">
                          <strong>{rupees(i.price)}</strong>
                        </td>
                        <td className="num muted">{perHead ? rupees(Math.ceil(perHead)) : "-"}</td>
                        <td className="right nowrap">
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(i)}>
                            Edit
                          </button>{" "}
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(i)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <ItemModal
          item={editing.id || editing._id ? editing : null}
          messes={MESSES}
          onSave={saveItem}
          onClose={() => setEditing(null)}
        />
      )}

      <Confirm
        open={!!confirmDelete}
        title={`Delete ${confirmDelete?.name}?`}
        message="This removes the package from the website permanently."
        confirmLabel="Delete package"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          try {
            await api.deleteItem(confirmDelete.id);
            setItems((l) => l.filter((i) => i.id !== confirmDelete.id));
          } catch (e) {
            setErr(e.message);
          }
          setConfirmDelete(null);
        }}
      />
    </>
  );
}
